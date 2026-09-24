// src/pages/ConversationView.js
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Spinner,
  Text,
  Textarea,
  VStack,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { AnimatePresence } from 'framer-motion';
import { FiArrowLeft, FiCheckCircle, FiFileText, FiSend, FiStar } from 'react-icons/fi';
import { useNavigate, useParams } from 'react-router-dom';
import {
  addMessage,
  addTags,
  getAgent,
  getConversation,
  interveneInConversation,
  releaseIntervention,
  submitFeedback,
  updateConversationStatus,
} from '../api';
import { useWebSocket } from '../context/WebSocketContext';
import { useAppData } from '../context/AppDataContext';
import TemplatePicker from '../components/TemplatePicker';
import { CountUp, GlassPanel, LiveDot, MotionBox, Reveal } from '../components/motion';

const SUPERVISOR_ID = 'supervisor-001';

// Three voices, three materials: customer = rose glass, AI = clear glass, supervisor = persimmon glass
const voice = {
  customer: {
    label: 'Customer',
    align: 'flex-start',
    bg: 'rgba(201,143,139,.11)',
    border: 'rgba(201,143,139,.26)',
    radius: '16px 16px 16px 4px',
  },
  agent: {
    label: 'AI agent',
    align: 'flex-end',
    bg: 'rgba(232,226,216,.05)',
    border: 'rgba(232,226,216,.12)',
    radius: '16px 16px 4px 16px',
  },
  supervisor: {
    label: 'Supervisor',
    align: 'flex-end',
    bg: 'rgba(227,99,63,.11)',
    border: 'rgba(227,99,63,.34)',
    radius: '16px 16px 4px 16px',
  },
};
const statusTone = { active: 'gray.300', waiting: 'orange.500', resolved: 'rose.500', escalated: 'brand.500' };

const messageKey = (m) => `${m.sender}|${m.text}|${new Date(m.timestamp).getTime()}`;

const Meter = ({ label, value, display, danger }) => (
  <Box w="100%">
    <Flex justify="space-between" align="baseline" mb={2}>
      <Text textStyle="eyebrow">{label}</Text>
      <Text fontFamily="mono" fontSize="13px" color={danger ? 'brand.500' : 'ink.500'}>
        {display}
      </Text>
    </Flex>
    <Box h="2px" bg="rgba(232,226,216,.12)" borderRadius="full" overflow="hidden">
      <MotionBox
        h="100%"
        borderRadius="full"
        bg={danger ? 'brand.500' : 'rose.500'}
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(2, Math.min(100, value))}%` }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      />
    </Box>
  </Box>
);

const SectionTitle = ({ children }) => (
  <Heading as="h3" fontSize="xl" mb={5}>
    {children}
  </Heading>
);

const ConversationView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { addListener } = useWebSocket();
  const { updateConversation } = useAppData();

  const [conversation, setConversation] = useState(null);
  const [agent, setAgent] = useState(null);
  const [error, setError] = useState(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [rating, setRating] = useState(0);
  const [fbCategory, setFbCategory] = useState('accuracy');
  const [fbComment, setFbComment] = useState('');

  const takeOver = useDisclosure();
  const release = useDisclosure();
  const templates = useDisclosure();
  const listRef = useRef(null);

  const fail = useCallback(
    (title, err) =>
      toast({
        title,
        description: err?.response?.data?.message || err?.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      }),
    [toast]
  );

  // Load conversation (and the agent's thresholds for the metric warnings)
  useEffect(() => {
    let cancelled = false;
    setConversation(null);
    setError(null);
    getConversation(id)
      .then((c) => {
        if (cancelled) return;
        setConversation(c);
        if (c.agent?.id) getAgent(c.agent.id).then((a) => !cancelled && setAgent(a)).catch(() => {});
      })
      .catch((err) => !cancelled && setError(err.response?.status === 404 ? 'Conversation not found' : err.message));
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Live updates for this conversation
  useEffect(() => {
    return addListener((msg) => {
      if (msg.type === 'message_update' && msg.conversationId === id) {
        setConversation((prev) => {
          if (!prev || prev.messages.some((m) => messageKey(m) === messageKey(msg.message))) return prev;
          return { ...prev, messages: [...prev.messages, msg.message] };
        });
      } else if (msg.type === 'metrics_update' && msg.conversationId === id) {
        setConversation((prev) =>
          prev ? { ...prev, metrics: { ...prev.metrics, ...msg.metrics }, alertLevel: msg.alertLevel || prev.alertLevel } : prev
        );
      } else if (msg.type === 'conversation_update' && msg.data?.id === id) {
        setConversation((prev) =>
          prev
            ? {
                ...prev,
                status: msg.data.status,
                alertLevel: msg.data.alertLevel,
                humanIntervention: { ...prev.humanIntervention, ...msg.data.humanIntervention },
              }
            : prev
        );
      }
    });
  }, [addListener, id]);

  const messageCount = conversation?.messages?.length;
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messageCount]);

  if (error) {
    return (
      <Box>
        <Alert status="error" borderRadius="md" mb={4}>
          <AlertIcon />
          {error}
        </Alert>
        <Button leftIcon={<FiArrowLeft />} onClick={() => navigate('/')}>
          Back to dashboard
        </Button>
      </Box>
    );
  }
  if (!conversation) {
    return (
      <Flex p={20} justify="center">
        <Spinner color="rose.500" />
      </Flex>
    );
  }

  const inControl = !!conversation.humanIntervention?.active;
  const resolved = conversation.status === 'resolved';
  const thresholds = agent?.escalationThresholds || {};
  const m = conversation.metrics || {};

  const patchConversation = (patch) => {
    setConversation((prev) => ({ ...prev, ...patch }));
    updateConversation(conversation.id, patch);
  };

  const handleTakeOver = async () => {
    setBusy(true);
    try {
      const res = await interveneInConversation(conversation.id, SUPERVISOR_ID, notes);
      patchConversation({ status: 'escalated', humanIntervention: res.intervention });
      takeOver.onClose();
      setNotes('');
      toast({ title: 'You are now in control', status: 'success', duration: 3000 });
    } catch (err) {
      fail('Could not take over', err);
    } finally {
      setBusy(false);
    }
  };

  const handleRelease = async () => {
    setBusy(true);
    try {
      await releaseIntervention(conversation.id, notes);
      patchConversation({
        status: 'active',
        humanIntervention: { ...conversation.humanIntervention, active: false, releaseNotes: notes },
      });
      release.onClose();
      setNotes('');
      toast({ title: 'Control returned to the AI agent', status: 'success', duration: 3000 });
    } catch (err) {
      fail('Could not release conversation', err);
    } finally {
      setBusy(false);
    }
  };

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const sent = await addMessage(conversation.id, { sender: 'supervisor', text });
      setConversation((prev) =>
        prev.messages.some((x) => messageKey(x) === messageKey(sent)) ? prev : { ...prev, messages: [...prev.messages, sent] }
      );
      setDraft('');
    } catch (err) {
      fail('Message not sent', err);
    } finally {
      setSending(false);
    }
  };

  const handleResolve = async () => {
    try {
      await updateConversationStatus(conversation.id, 'resolved');
      patchConversation({ status: 'resolved', humanIntervention: { ...conversation.humanIntervention, active: false } });
      toast({ title: 'Conversation resolved', status: 'success', duration: 3000 });
    } catch (err) {
      fail('Could not resolve', err);
    }
  };

  const handleAddTag = async () => {
    const tag = tagInput.trim().toLowerCase();
    if (!tag) return;
    try {
      const res = await addTags(conversation.id, [tag]);
      patchConversation({ tags: res.tags });
      setTagInput('');
    } catch (err) {
      fail('Could not add tag', err);
    }
  };

  const handleFeedback = async () => {
    try {
      const res = await submitFeedback(conversation.id, {
        rating,
        category: fbCategory,
        comment: fbComment,
        supervisorId: SUPERVISOR_ID,
      });
      setConversation((prev) => ({ ...prev, feedback: res.feedback }));
      setRating(0);
      setFbComment('');
      toast({ title: 'Feedback saved', status: 'success', duration: 3000 });
    } catch (err) {
      fail('Could not save feedback', err);
    }
  };

  return (
    <Box>
      <Reveal>
        <Flex justify="space-between" align="flex-end" wrap="wrap" gap={4} mb={9}>
          <Box>
            <Flex
              as="button"
              align="center"
              gap={2}
              mb={5}
              fontFamily="mono"
              fontSize="11px"
              letterSpacing="0.14em"
              textTransform="uppercase"
              color="gray.400"
              transition="color .2s ease, transform .2s ease"
              _hover={{ color: 'ink.500', transform: 'translateX(-3px)' }}
              onClick={() => navigate('/')}
            >
              <FiArrowLeft /> Dashboard
            </Flex>
            <Heading as="h1" textStyle="display" fontSize={{ base: '44px', md: '64px' }}>
              {conversation.customer?.name}
            </Heading>
            <Flex align="center" gap={5} mt={3} wrap="wrap">
              <Flex align="center" gap={2}>
                {conversation.alertLevel === 'high' && !resolved && <LiveDot size={7} />}
                <Text textStyle="eyebrow" color={statusTone[conversation.status]}>
                  {conversation.status}
                </Text>
              </Flex>
              <Text textStyle="eyebrow">{conversation.alertLevel} alert</Text>
              <Text textStyle="eyebrow">{conversation.customer?.id}</Text>
              <Text textStyle="eyebrow">{new Date(conversation.startTime).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</Text>
            </Flex>
          </Box>
          {!resolved && (
            <Button size="sm" variant="outline" leftIcon={<FiCheckCircle />} onClick={handleResolve}>
              Mark resolved
            </Button>
          )}
        </Flex>
      </Reveal>

      <Flex gap={6} direction={{ base: 'column', lg: 'row' }} align="flex-start">
        {/* Conversation */}
        <Reveal index={1} flex="2" w="100%" minW={0}>
          <GlassPanel hoverable={false} overflow="hidden" intervene={inControl && !resolved}>
            <Flex px={6} py={4} align="center" justify="space-between" gap={4} wrap="wrap" borderBottom="1px solid rgba(232,226,216,.08)">
              <Text fontFamily="heading" fontStyle="italic" fontSize="xl" fontWeight={300} color={inControl ? 'brand.500' : 'ink.500'}>
                {resolved
                  ? 'Resolved.'
                  : inControl
                  ? 'You have the floor. The AI is paused.'
                  : `${conversation.agent?.name} is handling this.`}
              </Text>
              {!resolved &&
                (inControl ? (
                  <Button size="sm" variant="outline" onClick={() => { setNotes(''); release.onOpen(); }}>
                    Return to AI
                  </Button>
                ) : (
                  <Button size="sm" colorScheme="brand" onClick={() => { setNotes(''); takeOver.onOpen(); }}>
                    Take over
                  </Button>
                ))}
            </Flex>

            <VStack
              ref={listRef}
              align="stretch"
              spacing={4}
              p={6}
              h={{ base: '52vh', lg: 'calc(100vh - 470px)' }}
              minH="340px"
              overflowY="auto"
              data-testid="message-list"
            >
              <AnimatePresence initial={false}>
                {conversation.messages.map((msg, i) => {
                  const v = voice[msg.sender] || voice.customer;
                  return (
                    <MotionBox
                      key={`${messageKey(msg)}-${i}`}
                      initial={{ opacity: 0, y: -18, scale: 0.96, filter: 'blur(6px)' }}
                      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                      alignSelf={v.align}
                      maxW="78%"
                      px={4}
                      py={3}
                      bg={v.bg}
                      border="1px solid"
                      borderColor={v.border}
                      borderRadius={v.radius}
                      backdropFilter="blur(12px) saturate(115%)"
                    >
                      <Flex justify="space-between" gap={6} mb={1.5}>
                        <Text textStyle="eyebrow" color={msg.sender === 'supervisor' ? 'brand.500' : msg.sender === 'customer' ? 'rose.500' : 'gray.400'}>
                          {v.label}
                        </Text>
                        <Text fontFamily="mono" fontSize="10px" color="gray.500">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </Flex>
                      <Text whiteSpace="pre-wrap" lineHeight="1.6">
                        {msg.text}
                      </Text>
                    </MotionBox>
                  );
                })}
              </AnimatePresence>
            </VStack>

            <Box p={5} borderTop="1px solid rgba(232,226,216,.08)">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={inControl ? 'Write as the supervisor…  (Ctrl+Enter to send)' : 'Take over the conversation to reply'}
                isDisabled={!inControl || resolved}
                rows={3}
                resize="none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSend();
                }}
              />
              <Flex mt={3} justify="space-between" align="center">
                <Button size="sm" variant="outline" leftIcon={<FiFileText />} onClick={templates.onOpen} isDisabled={!inControl || resolved}>
                  Templates
                </Button>
                <Button size="sm" rightIcon={<FiSend />} onClick={handleSend} isLoading={sending} isDisabled={!inControl || resolved || !draft.trim()}>
                  Send
                </Button>
              </Flex>
            </Box>
          </GlassPanel>
        </Reveal>

        {/* Side column */}
        <VStack flex="1" w="100%" minW={0} spacing={5} align="stretch">
          <Reveal index={2}>
            <GlassPanel p={6}>
              <SectionTitle>Customer</SectionTitle>
              <Flex gap={2} wrap="wrap" mb={4}>
                {(conversation.tags || []).map((t) => (
                  <Text key={t} fontFamily="mono" fontSize="11px" color="rose.500" border="1px solid rgba(201,143,139,.3)" borderRadius="full" px={3} py={0.5}>
                    #{t}
                  </Text>
                ))}
                {(conversation.tags || []).length === 0 && (
                  <Text fontSize="sm" color="gray.500">
                    No tags yet
                  </Text>
                )}
              </Flex>
              <Flex gap={2}>
                <Input size="sm" placeholder="Add a tag" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddTag()} />
                <Button size="sm" variant="outline" onClick={handleAddTag}>
                  Add
                </Button>
              </Flex>
            </GlassPanel>
          </Reveal>

          <Reveal index={3}>
            <GlassPanel p={6}>
              <SectionTitle>Live metrics</SectionTitle>
              <VStack spacing={5}>
                <Meter
                  label="Sentiment"
                  value={(m.sentiment || 0) * 100}
                  display={<CountUp value={Math.round((m.sentiment || 0) * 100)} suffix="%" duration={0.6} />}
                  danger={m.sentiment < (thresholds.negativeSentiment ?? 0.3)}
                />
                <Meter
                  label="AI confidence"
                  value={(m.confidenceScore || 0) * 100}
                  display={<CountUp value={Math.round((m.confidenceScore || 0) * 100)} suffix="%" duration={0.6} />}
                  danger={m.confidenceScore < (thresholds.lowConfidence ?? 0.4)}
                />
                <Meter
                  label="Response time"
                  value={Math.min(100, ((m.responseTime || 0) / (thresholds.responseTime || 20)) * 100)}
                  display={<CountUp value={m.responseTime || 0} decimals={1} suffix="s" duration={0.6} />}
                  danger={m.responseTime > (thresholds.responseTime ?? 20)}
                />
              </VStack>
              {conversation.humanIntervention?.occurred && (
                <Box mt={6} pt={5} borderTop="1px solid rgba(232,226,216,.08)" fontSize="sm" color="gray.300">
                  <Text textStyle="eyebrow" mb={2}>
                    Intervention
                  </Text>
                  <Text>By {conversation.humanIntervention.supervisorId}</Text>
                  {conversation.humanIntervention.notes && <Text>Reason: {conversation.humanIntervention.notes}</Text>}
                  {conversation.humanIntervention.releaseNotes && <Text>Guidance to AI: {conversation.humanIntervention.releaseNotes}</Text>}
                </Box>
              )}
            </GlassPanel>
          </Reveal>

          <Reveal index={4}>
            <GlassPanel p={6}>
              <SectionTitle>Rate the AI agent</SectionTitle>
              <Flex mb={4} gap={1}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Box
                    key={n}
                    as="button"
                    type="button"
                    aria-label={`${n} star${n > 1 ? 's' : ''}`}
                    onClick={() => setRating(n)}
                    color={n <= rating ? 'rose.500' : 'gray.600'}
                    fontSize="24px"
                    transition="transform .18s ease, color .2s ease"
                    _hover={{ transform: 'translateY(-2px) scale(1.12)', color: 'rose.400' }}
                  >
                    <FiStar fill={n <= rating ? 'currentColor' : 'none'} />
                  </Box>
                ))}
              </Flex>
              <FormControl mb={3}>
                <FormLabel>Area</FormLabel>
                <Select size="sm" value={fbCategory} onChange={(e) => setFbCategory(e.target.value)}>
                  <option value="accuracy">Accuracy</option>
                  <option value="tone">Tone & empathy</option>
                  <option value="policy">Policy compliance</option>
                  <option value="escalation">Escalation judgement</option>
                </Select>
              </FormControl>
              <Textarea size="sm" rows={2} placeholder="What should the agent do differently?" value={fbComment} onChange={(e) => setFbComment(e.target.value)} />
              <Button mt={3} size="sm" onClick={handleFeedback} isDisabled={!rating}>
                Submit feedback
              </Button>
              {(conversation.feedback || []).length > 0 && (
                <VStack align="stretch" mt={5} spacing={3}>
                  {conversation.feedback.map((f, i) => (
                    <Box key={i} fontSize="sm" p={3} layerStyle="glassInset">
                      <Text fontFamily="mono" fontSize="12px" color="rose.500">
                        {'★'.repeat(f.rating)}
                        {'☆'.repeat(5 - f.rating)}{' '}
                        <Text as="span" color="gray.400">
                          {f.category}
                        </Text>
                      </Text>
                      {f.comment && <Text mt={1}>{f.comment}</Text>}
                    </Box>
                  ))}
                </VStack>
              )}
            </GlassPanel>
          </Reveal>
        </VStack>
      </Flex>

      {/* Take over */}
      <Modal isOpen={takeOver.isOpen} onClose={takeOver.onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Take over this conversation</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text fontSize="sm" color="gray.300" mb={5}>
              The AI agent will stop replying and you will speak to {conversation.customer?.name} directly.
            </Text>
            <FormControl>
              <FormLabel>Why are you stepping in? (optional)</FormLabel>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </FormControl>
          </ModalBody>
          <ModalFooter gap={2}>
            <Button variant="ghost" onClick={takeOver.onClose}>
              Cancel
            </Button>
            <Button colorScheme="brand" onClick={handleTakeOver} isLoading={busy}>
              Take over
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Release */}
      <Modal isOpen={release.isOpen} onClose={release.onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Return control to the AI agent</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl>
              <FormLabel>Notes / guidance for the AI agent</FormLabel>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="e.g. Customer was offered expedited shipping and a $10 credit." />
            </FormControl>
          </ModalBody>
          <ModalFooter gap={2}>
            <Button variant="ghost" onClick={release.onClose}>
              Cancel
            </Button>
            <Button onClick={handleRelease} isLoading={busy}>
              Return to AI
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <TemplatePicker
        isOpen={templates.isOpen}
        onClose={templates.onClose}
        conversation={conversation}
        onInsert={(text) => setDraft((d) => (d.trim() ? `${d}\n${text}` : text))}
      />
    </Box>
  );
};

export default ConversationView;
