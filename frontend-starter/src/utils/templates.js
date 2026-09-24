// src/utils/templates.js
// Helpers for {{variable}} response templates.

const VAR_SOURCE = '\\{\\{\\s*([a-zA-Z_][a-zA-Z0-9_]*)\\s*\\}\\}';

// Distinct variable names in order of first appearance
export function extractVariables(content = '') {
  const names = [];
  const re = new RegExp(VAR_SOURCE, 'g');
  let m;
  while ((m = re.exec(content)) !== null) {
    if (!names.includes(m[1])) names.push(m[1]);
  }
  return names;
}

const isFilled = (values, name) => values && values[name] !== undefined && String(values[name]).trim() !== '';

// Replace placeholders that have a value; unfilled placeholders are left as {{name}}
export function fillTemplate(content = '', values = {}) {
  return content.replace(new RegExp(VAR_SOURCE, 'g'), (match, name) =>
    isFilled(values, name) ? String(values[name]).trim() : match
  );
}

// Names of variables that still have no value
export function missingVariables(content, values) {
  return extractVariables(content).filter((name) => !isFilled(values, name));
}

// Split content into text / variable segments so the UI can highlight placeholders.
// Variable segments carry `filled` and the text to display (value if filled, else {{name}}).
export function toSegments(content = '', values = {}) {
  const segments = [];
  const re = new RegExp(VAR_SOURCE, 'g');
  let last = 0;
  let m;
  while ((m = re.exec(content)) !== null) {
    if (m.index > last) segments.push({ type: 'text', text: content.slice(last, m.index) });
    const filled = isFilled(values, m[1]);
    segments.push({
      type: 'var',
      name: m[1],
      filled,
      text: filled ? String(values[m[1]]).trim() : `{{${m[1]}}}`,
    });
    last = m.index + m[0].length;
  }
  if (last < content.length) segments.push({ type: 'text', text: content.slice(last) });
  return segments;
}

// Guess values for common variables from the conversation so the supervisor has less to type
export function suggestValues(variableNames, conversation, supervisorName = 'Supervisor') {
  const values = {};
  if (!conversation) return values;
  const customerText = (conversation.messages || [])
    .filter((m) => m.sender === 'customer')
    .map((m) => m.text)
    .join(' ');
  const orderMatch = customerText.match(/#?(ORD-[A-Z0-9-]+)/i);

  variableNames.forEach((name) => {
    const key = name.toLowerCase();
    if (['customer_name', 'name', 'customer'].includes(key) && conversation.customer?.name) {
      values[name] = conversation.customer.name;
    } else if (['order_number', 'order_id', 'order'].includes(key) && orderMatch) {
      values[name] = orderMatch[1].toUpperCase();
    } else if (['agent_name', 'supervisor_name'].includes(key)) {
      values[name] = supervisorName;
    }
  });
  return values;
}
