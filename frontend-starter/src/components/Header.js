// src/components/Header.js
import React from 'react';
import { Box, Flex, IconButton, Input, InputGroup, InputLeftElement, Menu, MenuButton, MenuItem, MenuList, Text } from '@chakra-ui/react';
import { FiBell, FiSearch } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';

const Header = () => {
  const navigate = useNavigate();
  const { conversations } = useAppData();
  const alerts = conversations.filter((c) => c.alertLevel === 'high' && c.status !== 'resolved');

  return (
    <Flex
      as="header"
      position="sticky"
      top={0}
      zIndex={10}
      align="center"
      justify="space-between"
      px={{ base: 4, md: 10 }}
      py={4}
      bg="rgba(23,25,34,.55)"
      borderBottom="1px solid rgba(232,226,216,.08)"
      backdropFilter="blur(18px) saturate(108%)"
    >
      <InputGroup maxW="380px">
        <InputLeftElement pointerEvents="none" color="gray.400">
          <FiSearch />
        </InputLeftElement>
        <Input size="sm" placeholder="Search conversations or agents" borderRadius="full" />
      </InputGroup>

      <Flex align="center" gap={4}>
        <Menu placement="bottom-end">
          <Box position="relative">
            <MenuButton as={IconButton} aria-label="Notifications" icon={<FiBell />} variant="ghost" size="sm" />
            {alerts.length > 0 && (
              <Flex
                position="absolute"
                top="-2px"
                right="-2px"
                minW="16px"
                h="16px"
                px={1}
                borderRadius="full"
                bg="brand.500"
                color="gray.900"
                fontFamily="mono"
                fontSize="10px"
                fontWeight={500}
                align="center"
                justify="center"
                pointerEvents="none"
              >
                {alerts.length}
              </Flex>
            )}
          </Box>
          <MenuList>
            {alerts.length === 0 && <MenuItem isDisabled>No active alerts</MenuItem>}
            {alerts.slice(0, 6).map((c) => (
              <MenuItem key={c.id} onClick={() => navigate(`/conversation/${c.id}`)}>
                <Box w="6px" h="6px" borderRadius="full" bg="brand.500" mr={3} />
                {c.customer?.name}
              </MenuItem>
            ))}
          </MenuList>
        </Menu>
        <Text fontFamily="mono" fontSize="11px" letterSpacing="0.12em" textTransform="uppercase" color="gray.300">
          Supervisor
        </Text>
      </Flex>
    </Flex>
  );
};

export default Header;
