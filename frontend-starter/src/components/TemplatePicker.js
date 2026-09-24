// src/components/TemplatePicker.js
// "Template usage interface": pick a template, fill its variables, preview, insert into the composer.
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
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
  Text,
  VStack,
  FormHelperText,
} from '@chakra-ui/react';
import { FiSearch } from 'react-icons/fi';
import { getTemplates } from '../api';
import { extractVariables, fillTemplate, missingVariables, suggestValues } from '../utils/templates';
import TemplatePreview from './TemplatePreview';

const TemplatePicker = ({ isOpen, onClose, onInsert, conversation }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [selected, setSelected] = useState(null);
  const [values, setValues] = useState({});

  useEffect(() => {
    if (!isOpen) return;
    setSelected(null);
    setValues({});
    setSearch('');
    setLoading(true);
    getTemplates()
      .then((data) => {
        setTemplates(data);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isOpen]);

  const categories = useMemo(() => [...new Set(templates.map((t) => t.category))].sort(), [templates]);

  const visible = templates.filter((t) => {
    const q = search.trim().toLowerCase();
    return (
      (category === 'all' || t.category === category) &&
      (!q || t.name.toLowerCase().includes(q) || t.content.toLowerCase().includes(q))
    );
  });

  const choose = (template) => {
    setSelected(template);
    setValues(suggestValues(extractVariables(template.content), conversation));
  };

  const variableNames = selected ? extractVariables(selected.content) : [];
  const descriptions = selected
    ? Object.fromEntries((selected.variables || []).map((v) => [v.name, v.description]))
    : {};
  const missing = selected ? missingVariables(selected.content, values) : [];

  const insert = () => {
    onInsert(fillTemplate(selected.content, values));
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="4xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{selected ? `Use template: ${selected.name}` : 'Insert a response template'}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {!selected ? (
            <>
              <Flex gap={3} mb={4}>
                <InputGroup>
                  <InputLeftElement pointerEvents="none">
                    <FiSearch />
                  </InputLeftElement>
                  <Input
                    placeholder="Search templates"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </InputGroup>
                <Select maxW="200px" value={category} onChange={(e) => setCategory(e.target.value)}>
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
                <Text color="gray.400">No templates found. Create one on the Templates page.</Text>
              )}
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                {visible.map((t) => (
                  <Box
                    key={t.id}
                    p={4}
                    borderWidth="1px"
                    borderRadius="lg"
                    cursor="pointer"
                    transition="border-color .25s ease, background .25s ease, transform .25s ease"
                    _hover={{ borderColor: 'rose.500', bg: 'rgba(232,226,216,.06)', transform: 'translateY(-2px)' }}
                    onClick={() => choose(t)}
                  >
                    <Flex justify="space-between" mb={1}>
                      <Text fontFamily="heading" fontSize="lg">{t.name}</Text>
                      <Badge colorScheme="ink">{t.category}</Badge>
                    </Flex>
                    <Text fontSize="sm" color="gray.300" noOfLines={3}>
                      {t.content}
                    </Text>
                    <Text fontSize="xs" color="gray.400" mt={2}>
                      {extractVariables(t.content).length} variable(s)
                      {t.isShared ? ' • shared' : ''}
                    </Text>
                  </Box>
                ))}
              </SimpleGrid>
            </>
          ) : (
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
              <VStack align="stretch" spacing={3}>
                <Text fontWeight="semibold">Fill in the variables</Text>
                {variableNames.length === 0 && <Text color="gray.400">This template has no variables.</Text>}
                {variableNames.map((name) => (
                  <FormControl key={name} isRequired>
                    <FormLabel fontFamily="mono" fontSize="sm" mb={1}>
                      {`{{${name}}}`}
                    </FormLabel>
                    <Input
                      size="sm"
                      value={values[name] || ''}
                      onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}
                      placeholder={descriptions[name] || name}
                    />
                    {descriptions[name] && <FormHelperText>{descriptions[name]}</FormHelperText>}
                  </FormControl>
                ))}
              </VStack>
              <Box>
                <Text fontWeight="semibold" mb={2}>
                  Preview
                </Text>
                <Box p={4} layerStyle="glassInset">
                  <TemplatePreview content={selected.content} values={values} descriptions={descriptions} />
                </Box>
                <Flex mt={3} gap={2} fontSize="xs" color="gray.300" align="center">
                  <Badge colorScheme="yellow" textTransform="none">{'{{variable}}'}</Badge> not filled yet
                  <Badge colorScheme="green" textTransform="none">value</Badge> substituted
                </Flex>
                {missing.length > 0 && (
                  <Alert status="warning" mt={3} borderRadius="md" fontSize="sm">
                    <AlertIcon />
                    Fill in: {missing.join(', ')}
                  </Alert>
                )}
              </Box>
            </SimpleGrid>
          )}
        </ModalBody>
        <ModalFooter gap={2}>
          {selected && (
            <Button variant="ghost" mr="auto" onClick={() => setSelected(null)}>
              ← Back to templates
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {selected && (
            <Button colorScheme="ink" onClick={insert} isDisabled={missing.length > 0}>
              Insert into message
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default TemplatePicker;
