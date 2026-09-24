// src/pages/Templates.js - Template management screen + create/edit modal
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  Heading,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  SimpleGrid,
  Spinner,
  Switch,
  Tab,
  TabList,
  Tabs,
  Text,
  Textarea,
  VStack,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { FiEdit, FiPlus, FiSearch, FiTrash2 } from 'react-icons/fi';
import { createTemplate, deleteTemplate, getTemplates, updateTemplate } from '../api';
import { extractVariables } from '../utils/templates';
import TemplatePreview from '../components/TemplatePreview';
import { GlassPanel, Reveal } from '../components/motion';

const CURRENT_USER = 'supervisor-001';
const SUGGESTED_CATEGORIES = ['shipping', 'returns', 'billing', 'account', 'product', 'general'];
const EMPTY = { name: '', category: 'general', content: '', isShared: false, descriptions: {} };

const TemplateModal = ({ isOpen, onClose, template, onSaved }) => {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setTouched(false);
    setForm(
      template
        ? {
            name: template.name,
            category: template.category,
            content: template.content,
            isShared: template.isShared,
            descriptions: Object.fromEntries((template.variables || []).map((v) => [v.name, v.description || ''])),
          }
        : EMPTY
    );
  }, [isOpen, template]);

  const variableNames = useMemo(() => extractVariables(form.content), [form.content]);
  const errors = {
    name: !form.name.trim() && 'Name is required',
    category: !form.category.trim() && 'Category is required',
    content: !form.content.trim() && 'Content is required',
  };
  const invalid = Object.values(errors).some(Boolean);

  const save = async () => {
    setTouched(true);
    if (invalid) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      category: form.category.trim(),
      content: form.content,
      isShared: form.isShared,
      variables: variableNames.map((name) => ({ name, description: form.descriptions[name] || '' })),
    };
    try {
      const saved = template
        ? await updateTemplate(template.id, payload)
        : await createTemplate({ ...payload, createdBy: CURRENT_USER });
      toast({ title: template ? 'Template updated' : 'Template created', status: 'success', duration: 3000 });
      onSaved(saved);
      onClose();
    } catch (err) {
      toast({ title: 'Could not save template', description: err.response?.data?.message || err.message, status: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="4xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{template ? 'Edit template' : 'Create template'}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
            <VStack spacing={4} align="stretch">
              <FormControl isRequired isInvalid={touched && errors.name}>
                <FormLabel>Name</FormLabel>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </FormControl>
              <FormControl isRequired isInvalid={touched && errors.category}>
                <FormLabel>Category</FormLabel>
                <Input
                  list="template-categories"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                />
                <datalist id="template-categories">
                  {SUGGESTED_CATEGORIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </FormControl>
              <FormControl isRequired isInvalid={touched && errors.content}>
                <FormLabel>Content</FormLabel>
                <Textarea
                  rows={9}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="Hi {{customer_name}}, your order {{order_number}} ..."
                />
                <FormHelperText>
                  Wrap variables in double curly braces, e.g. <code>{'{{order_number}}'}</code>. Letters, numbers and
                  underscores only.
                </FormHelperText>
              </FormControl>
              <FormControl display="flex" alignItems="center">
                <Switch id="shared" isChecked={form.isShared} onChange={(e) => setForm({ ...form, isShared: e.target.checked })} mr={3} />
                <FormLabel htmlFor="shared" mb={0}>
                  Share with other supervisors
                </FormLabel>
              </FormControl>
            </VStack>

            <VStack spacing={4} align="stretch">
              <Box>
                <Text fontWeight="semibold" mb={2}>
                  Variables detected ({variableNames.length})
                </Text>
                {variableNames.length === 0 ? (
                  <Text fontSize="sm" color="gray.400">
                    None yet. Type a {'{{variable}}'} in the content.
                  </Text>
                ) : (
                  <VStack align="stretch" spacing={2}>
                    {variableNames.map((name) => (
                      <HStack key={name}>
                        <Badge colorScheme="yellow" fontFamily="mono" fontSize="xs" px={2} py={1} minW="120px" textAlign="center">
                          {`{{${name}}}`}
                        </Badge>
                        <Input
                          size="sm"
                          placeholder="Description (helps the supervisor fill it in)"
                          value={form.descriptions[name] || ''}
                          onChange={(e) =>
                            setForm({ ...form, descriptions: { ...form.descriptions, [name]: e.target.value } })
                          }
                        />
                      </HStack>
                    ))}
                  </VStack>
                )}
              </Box>
              <Box>
                <Text fontWeight="semibold" mb={2}>
                  Preview
                </Text>
                <Box p={3} layerStyle="glassInset" minH="120px">
                  {form.content.trim() ? (
                    <TemplatePreview content={form.content} descriptions={form.descriptions} />
                  ) : (
                    <Text fontSize="sm" color="gray.400">
                      Nothing to preview yet
                    </Text>
                  )}
                </Box>
              </Box>
            </VStack>
          </SimpleGrid>
        </ModalBody>
        <ModalFooter gap={2}>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button colorScheme="ink" onClick={save} isLoading={saving}>
            {template ? 'Save changes' : 'Create template'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

const Templates = () => {
  const toast = useToast();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState(0); // 0 all, 1 mine, 2 shared
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const modal = useDisclosure();
  const cancelRef = React.useRef();

  const load = useCallback(async () => {
    try {
      setTemplates(await getTemplates());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const categories = useMemo(() => [...new Set(templates.map((t) => t.category))].sort(), [templates]);

  const visible = templates.filter((t) => {
    const q = search.trim().toLowerCase();
    return (
      (tab === 0 || (tab === 1 && t.createdBy === CURRENT_USER) || (tab === 2 && t.isShared)) &&
      (category === 'all' || t.category === category) &&
      (!q || t.name.toLowerCase().includes(q) || t.content.toLowerCase().includes(q))
    );
  });

  const openEditor = (template = null) => {
    setEditing(template);
    modal.onOpen();
  };

  const confirmDelete = async () => {
    try {
      await deleteTemplate(toDelete.id);
      setTemplates((prev) => prev.filter((t) => t.id !== toDelete.id));
      toast({ title: 'Template deleted', status: 'success', duration: 3000 });
    } catch (err) {
      toast({ title: 'Could not delete template', description: err.message, status: 'error' });
    } finally {
      setToDelete(null);
    }
  };

  return (
    <Box>
      <Flex justify="space-between" align="flex-end" mb={10} wrap="wrap" gap={3}>
        <Box>
          <Text textStyle="eyebrow" mb={4}>
            Reusable replies · {templates.length} in the library
          </Text>
          <Heading as="h1" textStyle="display" fontSize={{ base: '44px', md: '64px' }}>
            Response{' '}
            <Box as="span" fontStyle="italic" color="rose.500">
              templates
            </Box>
            .
          </Heading>
          <Text color="gray.400" mt={3} maxW="52ch">
            Ready-made answers with {'{{variables}}'} you fill in before sending, so a placeholder never reaches a customer.
          </Text>
        </Box>
        <Button leftIcon={<FiPlus />} onClick={() => openEditor()}>
          New template
        </Button>
      </Flex>

      <Tabs index={tab} onChange={setTab} mb={6}>
        <TabList>
          <Tab>All</Tab>
          <Tab>My templates</Tab>
          <Tab>Shared</Tab>
        </TabList>
      </Tabs>

      <Flex gap={3} mb={5}>
        <InputGroup>
          <InputLeftElement pointerEvents="none">
            <FiSearch />
          </InputLeftElement>
          <Input placeholder="Search templates" value={search} onChange={(e) => setSearch(e.target.value)} />
        </InputGroup>
        <Select maxW="220px" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </Flex>

      {loading && <Spinner />}
      {error && <Text color="red.500">Could not load templates: {error}</Text>}
      {!loading && !error && visible.length === 0 && (
        <Box p={8} textAlign="center" color="gray.400" bg="white" borderRadius="lg">
          No templates found.
        </Box>
      )}

      <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={5} layerStyle="stagger">
        {visible.map((t) => (
          <GlassPanel key={t.id} display="flex" flexDirection="column" p={6} gap={3}>
            <Flex justify="space-between" align="start" gap={2}>
              <Heading as="h3" fontSize="xl" lineHeight="1.2">
                {t.name}
              </Heading>
              <HStack spacing={1}>
                <Badge colorScheme="ink">{t.category}</Badge>
                {t.isShared && <Badge colorScheme="green">shared</Badge>}
              </HStack>
            </Flex>
            <TemplatePreview
              content={t.content}
              descriptions={Object.fromEntries((t.variables || []).map((v) => [v.name, v.description]))}
              noOfLines={5}
              color="gray.200"
            />
            <Text fontSize="xs" color="gray.400">
              {extractVariables(t.content).length} variable(s) • by {t.createdBy || 'unknown'} • updated{' '}
              {new Date(t.updatedAt).toLocaleDateString()}
            </Text>
            <HStack mt="auto">
              <IconButton size="sm" variant="outline" aria-label="Edit template" icon={<FiEdit />} onClick={() => openEditor(t)} />
              <IconButton size="sm" variant="outline" aria-label="Delete template" icon={<FiTrash2 />} onClick={() => setToDelete(t)} />
            </HStack>
          </GlassPanel>
        ))}
      </SimpleGrid>

      <TemplateModal
        isOpen={modal.isOpen}
        onClose={modal.onClose}
        template={editing}
        onSaved={(saved) =>
          setTemplates((prev) => (prev.some((t) => t.id === saved.id) ? prev.map((t) => (t.id === saved.id ? saved : t)) : [saved, ...prev]))
        }
      />

      <AlertDialog isOpen={!!toDelete} leastDestructiveRef={cancelRef} onClose={() => setToDelete(null)}>
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader>Delete template</AlertDialogHeader>
            <AlertDialogBody>Delete “{toDelete?.name}”? This cannot be undone.</AlertDialogBody>
            <AlertDialogFooter gap={2}>
              <Button ref={cancelRef} onClick={() => setToDelete(null)}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={confirmDelete}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

export default Templates;
