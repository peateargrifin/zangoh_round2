// src/pages/AgentConfig.js
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  Heading,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Select,
  SimpleGrid,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Spinner,
  Switch,
  Text,
  Textarea,
  VStack,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { FiTrash2 } from 'react-icons/fi';
import { createPreset, deletePreset, getAgent, getPresets, updateAgentConfig } from '../api';
import { useAppData } from '../context/AppDataContext';
import { GlassPanel } from '../components/motion';

// Editable slice of an agent as returned by the API
const toForm = (agent) => ({
  parameters: {
    temperature: agent.parameters?.temperature ?? 0.7,
    max_tokens: agent.parameters?.max_tokens ?? 150,
    top_p: agent.parameters?.top_p ?? 1,
  },
  capabilities: (agent.capabilities || []).map((c) => ({ id: c.id, name: c.name, enabled: c.enabled })),
  knowledgeBases: (agent.knowledgeBases || []).map((k) => ({ id: k.id, name: k.name, enabled: k.enabled })),
  escalationThresholds: {
    lowConfidence: agent.escalationThresholds?.lowConfidence ?? 0.4,
    negativeSentiment: agent.escalationThresholds?.negativeSentiment ?? 0.3,
    responseTime: agent.escalationThresholds?.responseTime ?? 20,
  },
});

const SliderField = ({ label, help, value, min = 0, max = 1, step = 0.01, onChange, format }) => (
  <Box>
    <Flex justify="space-between" mb={1}>
      <Text textStyle="eyebrow" color="gray.300">{label}</Text>
      <Text fontFamily="mono" fontSize="13px" color="rose.500">{format ? format(value) : value.toFixed(2)}</Text>
    </Flex>
    <Slider value={value} min={min} max={max} step={step} onChange={onChange} aria-label={label} focusThumbOnChange={false}>
      <SliderTrack>
        <SliderFilledTrack />
      </SliderTrack>
      <SliderThumb />
    </Slider>
    {help && (
      <Text fontSize="xs" color="gray.400" mt={1}>
        {help}
      </Text>
    )}
  </Box>
);

const AgentConfig = () => {
  const toast = useToast();
  const { agents, loading, updateAgent } = useAppData();
  const [agentId, setAgentId] = useState('');
  const [saved, setSaved] = useState(null); // last persisted form
  const [form, setForm] = useState(null);
  const [agentInfo, setAgentInfo] = useState(null);
  const [saving, setSaving] = useState(false);
  const [presets, setPresets] = useState([]);
  const [presetId, setPresetId] = useState('');
  const [presetName, setPresetName] = useState('');
  const [presetDesc, setPresetDesc] = useState('');
  const presetModal = useDisclosure();

  useEffect(() => {
    if (!agentId && agents.length) setAgentId(agents[0].id);
  }, [agents, agentId]);

  const loadAgent = useCallback(async (id) => {
    const agent = await getAgent(id);
    setAgentInfo(agent);
    const f = toForm(agent);
    setSaved(f);
    setForm(f);
  }, []);

  useEffect(() => {
    if (!agentId) return;
    setForm(null);
    loadAgent(agentId).catch((err) => toast({ title: 'Could not load agent', description: err.message, status: 'error' }));
  }, [agentId, loadAgent, toast]);

  const loadPresets = useCallback(() => getPresets().then(setPresets).catch(() => {}), []);
  useEffect(() => {
    loadPresets();
  }, [loadPresets]);

  const dirty = useMemo(() => form && saved && JSON.stringify(form) !== JSON.stringify(saved), [form, saved]);

  if (!loading.agents && !agents.length) return <Text p={4}>No agents available.</Text>;
  if (loading.agents || !form) {
    return (
      <Flex p={10} justify="center">
        <Spinner />
      </Flex>
    );
  }

  const setParam = (key, value) => setForm((f) => ({ ...f, parameters: { ...f.parameters, [key]: value } }));
  const setThreshold = (key, value) =>
    setForm((f) => ({ ...f, escalationThresholds: { ...f.escalationThresholds, [key]: value } }));
  const toggle = (group, id) =>
    setForm((f) => ({ ...f, [group]: f[group].map((x) => (x.id === id ? { ...x, enabled: !x.enabled } : x)) }));

  const selectAgent = (id) => {
    if (dirty && !window.confirm('Discard unsaved changes?')) return;
    setAgentId(id);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await updateAgentConfig(agentId, {
        parameters: form.parameters,
        capabilities: form.capabilities.map(({ id, enabled }) => ({ id, enabled })),
        knowledgeBases: form.knowledgeBases.map(({ id, enabled }) => ({ id, enabled })),
        escalationThresholds: form.escalationThresholds,
      });
      const f = toForm(res.agent);
      setSaved(f);
      setForm(f);
      setAgentInfo(res.agent);
      updateAgent(agentId, res.agent);
      toast({ title: 'Configuration saved', status: 'success', duration: 3000 });
    } catch (err) {
      toast({ title: 'Save failed', description: err.response?.data?.message || err.message, status: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Presets can be applied to any agent: match capabilities / KBs by id, keep the rest as-is
  const applyPreset = () => {
    const preset = presets.find((p) => p.id === presetId);
    if (!preset) return;
    setForm((f) => ({
      parameters: { ...f.parameters, ...stripMeta(preset.parameters) },
      capabilities: f.capabilities.map((c) => {
        const p = (preset.capabilities || []).find((x) => x.id === c.id);
        return p ? { ...c, enabled: p.enabled } : c;
      }),
      knowledgeBases: f.knowledgeBases.map((k) => {
        const p = (preset.knowledgeBases || []).find((x) => x.id === k.id);
        return p ? { ...k, enabled: p.enabled } : k;
      }),
      escalationThresholds: { ...f.escalationThresholds, ...stripMeta(preset.escalationThresholds) },
    }));
    toast({ title: `Preset “${preset.name}” loaded`, description: 'Review and click Save changes to apply.', status: 'info', duration: 4000 });
  };

  const handleSavePreset = async () => {
    if (!presetName.trim()) return;
    try {
      const preset = await createPreset({
        name: presetName,
        description: presetDesc,
        agentId,
        parameters: form.parameters,
        capabilities: form.capabilities.map(({ id, enabled }) => ({ id, enabled })),
        knowledgeBases: form.knowledgeBases.map(({ id, enabled }) => ({ id, enabled })),
        escalationThresholds: form.escalationThresholds,
      });
      setPresets((p) => [preset, ...p]);
      setPresetId(preset.id);
      setPresetName('');
      setPresetDesc('');
      presetModal.onClose();
      toast({ title: 'Preset saved', status: 'success', duration: 3000 });
    } catch (err) {
      toast({ title: 'Could not save preset', description: err.response?.data?.message || err.message, status: 'error' });
    }
  };

  const handleDeletePreset = async () => {
    const preset = presets.find((p) => p.id === presetId);
    if (!preset || !window.confirm(`Delete preset “${preset.name}”?`)) return;
    try {
      await deletePreset(presetId);
      setPresets((p) => p.filter((x) => x.id !== presetId));
      setPresetId('');
    } catch (err) {
      toast({ title: 'Could not delete preset', description: err.message, status: 'error' });
    }
  };

  const t = form.escalationThresholds;

  return (
    <Box maxW="1100px">
      <Flex justify="space-between" align="flex-end" mb={10} wrap="wrap" gap={3}>
        <Box>
          <Text textStyle="eyebrow" mb={4}>
            {agentInfo?.model} · {agentInfo?.status}
          </Text>
          <Heading as="h1" textStyle="display" fontSize={{ base: '44px', md: '64px' }}>
            Tune the{' '}
            <Box as="span" fontStyle="italic" color="rose.500">
              agent
            </Box>
            .
          </Heading>
          <Text color="gray.400" mt={3} maxW="52ch">
            {agentInfo?.description}
          </Text>
        </Box>
        <HStack>
          {dirty && <Badge colorScheme="orange">Unsaved changes</Badge>}
          <Button variant="outline" onClick={() => setForm(saved)} isDisabled={!dirty}>
            Reset
          </Button>
          <Button colorScheme="ink" onClick={handleSave} isLoading={saving} isDisabled={!dirty}>
            Save changes
          </Button>
        </HStack>
      </Flex>

      <VStack spacing={6} align="stretch" layerStyle="stagger">
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
          <GlassPanel p={7}>
            <FormControl>
              <FormLabel fontWeight="semibold">Agent</FormLabel>
              <Select value={agentId} onChange={(e) => selectAgent(e.target.value)}>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
              <Text fontSize="xs" color="gray.400" mt={1}>
                Model: {agentInfo?.model} • status: {agentInfo?.status}
              </Text>
            </FormControl>
          </GlassPanel>

          <GlassPanel p={7}>
            <Heading as="h3" fontSize="xl" mb={4}>
              Presets
            </Heading>
            <HStack>
              <Select placeholder="Select a preset" value={presetId} onChange={(e) => setPresetId(e.target.value)}>
                {presets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
              <Button onClick={applyPreset} isDisabled={!presetId}>
                Load
              </Button>
              <IconButton variant="outline" aria-label="Delete preset" icon={<FiTrash2 />} onClick={handleDeletePreset} isDisabled={!presetId} />
            </HStack>
            {presetId && <Text fontSize="xs" color="gray.400" mt={1}>{presets.find((p) => p.id === presetId)?.description}</Text>}
            <Button mt={3} size="sm" variant="outline" onClick={presetModal.onOpen}>
              Save current settings as preset
            </Button>
          </GlassPanel>
        </SimpleGrid>

        <GlassPanel p={7}>
          <Heading as="h3" fontSize="xl" mb={5}>
            Model parameters
          </Heading>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={8}>
            <SliderField
              label="Temperature"
              help="Lower is more precise, higher is more creative."
              value={form.parameters.temperature}
              onChange={(v) => setParam('temperature', v)}
            />
            <SliderField
              label="Top-p"
              help="Nucleus sampling cut-off."
              value={form.parameters.top_p}
              onChange={(v) => setParam('top_p', v)}
            />
            <FormControl>
              <FormLabel fontWeight="medium">Max tokens</FormLabel>
              <NumberInput
                min={1}
                max={4096}
                step={10}
                value={form.parameters.max_tokens}
                onChange={(_, n) => setParam('max_tokens', Number.isNaN(n) ? 1 : n)}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
              <Text fontSize="xs" color="gray.400" mt={1}>
                Maximum length of a reply (1–4096).
              </Text>
            </FormControl>
          </SimpleGrid>
        </GlassPanel>

        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
          <GlassPanel p={7}>
            <Heading as="h3" fontSize="xl" mb={5}>
              Capabilities
            </Heading>
            <VStack align="stretch" spacing={3}>
              {form.capabilities.map((c) => (
                <Flex key={c.id} justify="space-between" align="center">
                  <Text>{c.name}</Text>
                  <Switch isChecked={c.enabled} onChange={() => toggle('capabilities', c.id)} aria-label={c.name} colorScheme="ink" />
                </Flex>
              ))}
              {form.capabilities.length === 0 && <Text color="gray.400">No capabilities defined.</Text>}
            </VStack>
          </GlassPanel>

          <GlassPanel p={7}>
            <Heading as="h3" fontSize="xl" mb={5}>
              Knowledge domains
            </Heading>
            <VStack align="stretch" spacing={3}>
              {form.knowledgeBases.map((k) => (
                <Flex key={k.id} justify="space-between" align="center">
                  <Text>{k.name}</Text>
                  <Switch isChecked={k.enabled} onChange={() => toggle('knowledgeBases', k.id)} aria-label={k.name} colorScheme="ink" />
                </Flex>
              ))}
              {form.knowledgeBases.length === 0 && <Text color="gray.400">No knowledge bases attached.</Text>}
            </VStack>
          </GlassPanel>
        </SimpleGrid>

        <GlassPanel p={7}>
          <Heading as="h3" fontSize="xl" mb={1}>
            Escalation thresholds
          </Heading>
          <Text fontSize="sm" color="gray.400" mb={4}>
            Conversations that cross these limits are flagged on the dashboard.
          </Text>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={8}>
            <SliderField
              label="Low AI confidence below"
              value={t.lowConfidence}
              onChange={(v) => setThreshold('lowConfidence', v)}
              format={(v) => `${Math.round(v * 100)}%`}
            />
            <SliderField
              label="Negative sentiment below"
              value={t.negativeSentiment}
              onChange={(v) => setThreshold('negativeSentiment', v)}
              format={(v) => `${Math.round(v * 100)}%`}
            />
            <SliderField
              label="Slow response above"
              min={1}
              max={60}
              step={1}
              value={t.responseTime}
              onChange={(v) => setThreshold('responseTime', v)}
              format={(v) => `${v}s`}
            />
          </SimpleGrid>
        </GlassPanel>
      </VStack>

      <Modal isOpen={presetModal.isOpen} onClose={presetModal.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Save as preset</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Alert status="info" mb={4} borderRadius="md" fontSize="sm">
              <AlertIcon />
              Saves the current parameters, capability and knowledge toggles and thresholds (including unsaved edits).
            </Alert>
            <FormControl isRequired mb={3}>
              <FormLabel>Name</FormLabel>
              <Input value={presetName} onChange={(e) => setPresetName(e.target.value)} />
            </FormControl>
            <FormControl>
              <FormLabel>Description</FormLabel>
              <Textarea rows={2} value={presetDesc} onChange={(e) => setPresetDesc(e.target.value)} />
            </FormControl>
          </ModalBody>
          <ModalFooter gap={2}>
            <Button variant="ghost" onClick={presetModal.onClose}>
              Cancel
            </Button>
            <Button colorScheme="ink" onClick={handleSavePreset} isDisabled={!presetName.trim()}>
              Save preset
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

// Mongoose documents serialise with _id etc.; only keep plain numeric settings
function stripMeta(obj = {}) {
  return Object.fromEntries(Object.entries(obj).filter(([k, v]) => typeof v === 'number' && k !== '__v'));
}

export default AgentConfig;
