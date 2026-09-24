// Seed script for initializing the database with sample data
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/zangoh';

// Import models
const Conversation = require('../models/conversation');
const Agent = require('../models/agent');
const KnowledgeBase = require('../models/knowledgeBase');
const ResponseTemplate = require('../models/responseTemplate');
const Preset = require('../models/preset');

// Sample data
const conversations = [
  {
    id: "conv-2023-10",
    customer: {
      id: "cust-5672",
      name: "Alex Johnson"
    },
    agent: {
      id: "agent-cs-1",
      name: "Customer Service Agent"
    },
    status: "active",
    alertLevel: "high",
    startTime: new Date(Date.now() - 20 * 60000),
    metrics: {
      sentiment: 0.2,
      responseTime: 15.3,
      confidenceScore: 0.65
    },
    messages: [
      {
        sender: "customer",
        text: "I ordered a package 5 days ago and it still hasn't arrived. The tracking hasn't updated in 3 days.",
        timestamp: new Date(Date.now() - 20 * 60000)
      },
      {
        sender: "agent",
        text: "I understand your concern about your package. Let me check the status for you. Could you please provide your order number?",
        timestamp: new Date(Date.now() - 19 * 60000)
      },
      {
        sender: "customer",
        text: "Order #ORD-29384-KJH. I need this package by tomorrow for my daughter's birthday.",
        timestamp: new Date(Date.now() - 18 * 60000)
      },
      {
        sender: "agent",
        text: "Thank you for providing your order number. I'm checking your order status now.",
        timestamp: new Date(Date.now() - 17 * 60000)
      },
      {
        sender: "agent",
        text: "I can see that your package is currently in transit. Sometimes tracking information may take time to update.",
        timestamp: new Date(Date.now() - 16 * 60000)
      },
      {
        sender: "customer",
        text: "That's not helpful at all. I need to know if it will arrive by tomorrow. This is a gift for my daughter!",
        timestamp: new Date(Date.now() - 15 * 60000)
      },
      {
        sender: "agent",
        text: "I apologize for the inconvenience. Based on the current location of your package, standard delivery estimates suggest it should arrive within 1-2 business days.",
        timestamp: new Date(Date.now() - 14 * 60000)
      },
      {
        sender: "customer",
        text: "That's not good enough. I paid for express shipping specifically to have it arrive by tomorrow. I want to speak to a human representative.",
        timestamp: new Date(Date.now() - 13 * 60000)
      }
    ],
    tags: ["shipping", "delay", "urgent", "escalation-requested"],
    humanIntervention: {
      occurred: false
    }
  },
  
  {
    id: "conv-2023-45",
    customer: {
      id: "cust-3891",
      name: "Morgan Smith"
    },
    agent: {
      id: "agent-cs-2",
      name: "Product Specialist Agent"
    },
    status: "active",
    alertLevel: "low",
    startTime: new Date(Date.now() - 10 * 60000),
    metrics: {
      sentiment: 0.8,
      responseTime: 8.2,
      confidenceScore: 0.92
    },
    messages: [
      {
        sender: "customer",
        text: "Does the Eco-Friendly Blender come with a warranty?",
        timestamp: new Date(Date.now() - 10 * 60000)
      },
      {
        sender: "agent",
        text: "Yes, the Eco-Friendly Blender comes with a 2-year manufacturer's warranty that covers parts and labor for defects in materials or workmanship.",
        timestamp: new Date(Date.now() - 9 * 60000)
      },
      {
        sender: "customer",
        text: "Great! And what's the wattage on the motor?",
        timestamp: new Date(Date.now() - 8 * 60000)
      },
      {
        sender: "agent",
        text: "The Eco-Friendly Blender features a powerful 1200-watt motor, which is excellent for blending tough ingredients like frozen fruits and vegetables.",
        timestamp: new Date(Date.now() - 7 * 60000)
      },
      {
        sender: "customer",
        text: "Perfect. One last question - does it come in any colors besides white?",
        timestamp: new Date(Date.now() - 6 * 60000)
      },
      {
        sender: "agent",
        text: "Yes, the Eco-Friendly Blender is available in white, black, red, and a limited edition green color. All colors are currently in stock and the same price.",
        timestamp: new Date(Date.now() - 5 * 60000)
      },
      {
        sender: "customer",
        text: "Thanks so much for the information! I think I'll go with the red one.",
        timestamp: new Date(Date.now() - 4 * 60000)
      }
    ],
    tags: ["product", "information", "positive"],
    humanIntervention: {
      occurred: false
    }
  },
  
  {
    id: "conv-2023-78",
    customer: {
      id: "cust-7294",
      name: "Jamie Lee"
    },
    agent: {
      id: "agent-cs-3",
      name: "Returns Specialist Agent"
    },
    status: "active",
    alertLevel: "medium",
    startTime: new Date(Date.now() - 15 * 60000),
    metrics: {
      sentiment: 0.5,
      responseTime: 12.7,
      confidenceScore: 0.75
    },
    messages: [
      {
        sender: "customer",
        text: "I bought a sweater last month but it's pilling badly after just two washes. I'd like to return it but I no longer have the receipt. Can I still get a refund? Also, if I exchange it for something else, will I need to pay for shipping?",
        timestamp: new Date(Date.now() - 15 * 60000)
      },
      {
        sender: "agent",
        text: "I'm sorry to hear about the quality issue with your sweater. For returns without a receipt, we can offer store credit at the current selling price if we can verify the purchase through the credit card used, your loyalty account, or email address.",
        timestamp: new Date(Date.now() - 14 * 60000)
      },
      {
        sender: "customer",
        text: "I used my loyalty account when purchasing. It's linked to my email jamie.lee@example.com.",
        timestamp: new Date(Date.now() - 13 * 60000)
      },
      {
        sender: "agent",
        text: "Thank you for providing that information. Let me check your purchase history through your loyalty account.",
        timestamp: new Date(Date.now() - 12 * 60000)
      },
      {
        sender: "agent",
        text: "I've found your purchase from April 15th for the Cozy Comfort Sweater in size M for $49.99. Since this is a quality issue, we'd be happy to process a full refund to your original payment method.",
        timestamp: new Date(Date.now() - 11 * 60000)
      },
      {
        sender: "customer",
        text: "That's great, thanks! What about my second question regarding exchange shipping?",
        timestamp: new Date(Date.now() - 10 * 60000)
      },
      {
        sender: "agent",
        text: "For exchanges due to quality issues, we cover the return shipping costs. If you'd like to exchange for a different item, we also provide free shipping for the new item as a courtesy.",
        timestamp: new Date(Date.now() - 9 * 60000)
      },
      {
        sender: "customer",
        text: "Perfect! I think I'll go ahead with the refund for now and order something else later. How do I start the return process?",
        timestamp: new Date(Date.now() - 8 * 60000)
      },
      {
        sender: "agent",
        text: "I'll email you a prepaid return shipping label that you can print out. Pack the sweater in any box or envelope, attach the label, and drop it off at any postal service location or scheduled pickup. Once we receive it, we'll process your refund within 3-5 business days.",
        timestamp: new Date(Date.now() - 7 * 60000)
      }
    ],
    tags: ["returns", "quality-issue", "multi-part-question"],
    humanIntervention: {
      occurred: false
    }
  }
];

const agents = [
  {
    id: "agent-cs-1",
    name: "Customer Service Agent",
    model: "gpt-3.5-turbo",
    description: "General customer service agent for handling inquiries",
    parameters: {
      temperature: 0.7,
      max_tokens: 150,
      top_p: 1.0
    },
    capabilities: [
      { id: "order_lookup", name: "Order Lookup", enabled: true },
      { id: "return_processing", name: "Return Processing", enabled: true },
      { id: "product_info", name: "Product Information", enabled: true },
      { id: "shipping_calculator", name: "Shipping Calculator", enabled: false },
      { id: "discount_manager", name: "Discount Manager", enabled: false }
    ],
    knowledgeBases: [
      { id: "kb-cs-general", name: "Customer Service Guidelines", enabled: true },
      { id: "kb-product-catalog", name: "Product Catalog", enabled: true },
      { id: "kb-shipping-policy", name: "Shipping Policy", enabled: true },
      { id: "kb-return-policy", name: "Return Policy", enabled: true }
    ],
    escalationThresholds: {
      lowConfidence: 0.4,
      negativeSentiment: 0.3,
      responseTime: 20
    },
    status: "active",
    metrics: {
      conversations: 2456,
      avgResponseTime: 12.7,
      satisfaction: 0.86,
      escalationRate: 0.16,
      topIssues: [
        { name: "Shipping Delays", count: 587 },
        { name: "Order Status", count: 423 },
        { name: "Payment Issues", count: 312 }
      ]
    }
  },
  {
    id: "agent-cs-2",
    name: "Product Specialist Agent",
    model: "gpt-4o",
    description: "Specialized agent for product information and technical questions",
    parameters: {
      temperature: 0.5,
      max_tokens: 200,
      top_p: 0.9
    },
    capabilities: [
      { id: "order_lookup", name: "Order Lookup", enabled: false },
      { id: "return_processing", name: "Return Processing", enabled: false },
      { id: "product_info", name: "Product Information", enabled: true },
      { id: "product_comparison", name: "Product Comparison", enabled: true },
      { id: "technical_support", name: "Technical Support", enabled: true }
    ],
    knowledgeBases: [
      { id: "kb-product-catalog", name: "Product Catalog", enabled: true },
      { id: "kb-product-specs", name: "Technical Specifications", enabled: true },
      { id: "kb-product-faq", name: "Product FAQs", enabled: true }
    ],
    escalationThresholds: {
      lowConfidence: 0.6,
      negativeSentiment: 0.4,
      responseTime: 15
    },
    status: "active",
    metrics: {
      conversations: 1879,
      avgResponseTime: 14.2,
      satisfaction: 0.91,
      escalationRate: 0.08,
      topIssues: [
        { name: "Product Features", count: 542 },
        { name: "Compatibility", count: 389 },
        { name: "Technical Specs", count: 298 }
      ]
    }
  },
  {
    id: "agent-cs-3",
    name: "Returns Specialist Agent",
    model: "claude-3-haiku",
    description: "Specialized agent for handling returns and refunds",
    parameters: {
      temperature: 0.3,
      max_tokens: 150,
      top_p: 0.95
    },
    capabilities: [
      { id: "order_lookup", name: "Order Lookup", enabled: true },
      { id: "return_processing", name: "Return Processing", enabled: true },
      { id: "refund_calculator", name: "Refund Calculator", enabled: true },
      { id: "shipping_calculator", name: "Shipping Calculator", enabled: true },
      { id: "discount_manager", name: "Discount Manager", enabled: false }
    ],
    knowledgeBases: [
      { id: "kb-return-policy", name: "Return Policy", enabled: true },
      { id: "kb-shipping-policy", name: "Shipping Policy", enabled: true },
      { id: "kb-warranty-info", name: "Warranty Information", enabled: true }
    ],
    escalationThresholds: {
      lowConfidence: 0.5,
      negativeSentiment: 0.3,
      responseTime: 18
    },
    status: "active",
    metrics: {
      conversations: 1456,
      avgResponseTime: 11.5,
      satisfaction: 0.84,
      escalationRate: 0.19,
      topIssues: [
        { name: "Return Eligibility", count: 412 },
        { name: "Refund Status", count: 376 },
        { name: "Exchange Process", count: 289 }
      ]
    }
  }
];

const knowledgeBases = [
  {
    id: "kb-cs-general",
    name: "Customer Service Guidelines",
    description: "General customer service policies and procedures",
    documentCount: 45,
    lastUpdated: new Date("2023-09-15T14:30:00Z")
  },
  {
    id: "kb-product-catalog",
    name: "Product Catalog",
    description: "Complete product listings with details and pricing",
    documentCount: 1243,
    lastUpdated: new Date("2023-10-01T09:15:00Z")
  },
  {
    id: "kb-shipping-policy",
    name: "Shipping Policy",
    description: "Shipping options, timelines, and costs",
    documentCount: 12,
    lastUpdated: new Date("2023-08-22T11:45:00Z")
  },
  {
    id: "kb-return-policy",
    name: "Return Policy",
    description: "Return and exchange procedures and limitations",
    documentCount: 18,
    lastUpdated: new Date("2023-09-05T16:20:00Z")
  },
  {
    id: "kb-product-specs",
    name: "Technical Specifications",
    description: "Detailed technical information for all products",
    documentCount: 842,
    lastUpdated: new Date("2023-09-28T13:10:00Z")
  },
  {
    id: "kb-product-faq",
    name: "Product FAQs",
    description: "Frequently asked questions about products",
    documentCount: 367,
    lastUpdated: new Date("2023-09-18T10:30:00Z")
  },
  {
    id: "kb-warranty-info",
    name: "Warranty Information",
    description: "Warranty terms and claim procedures",
    documentCount: 29,
    lastUpdated: new Date("2023-08-15T15:45:00Z")
  }
];

const templates = [
  {
    id: 'template-001',
    name: 'Shipping Delay Apology',
    category: 'shipping',
    content: "I apologize for the delay with your order #{{order_number}}. We're experiencing some delays in our shipping department, but your package is expected to arrive by {{expected_date}}. As a courtesy for the inconvenience, I've added a $10 credit to your account.",
    variables: [
      { name: 'order_number', description: "Customer's order number" },
      { name: 'expected_date', description: 'Expected delivery date' }
    ],
    createdBy: 'supervisor-001',
    isShared: true
  },
  {
    id: 'template-002',
    name: 'Return Process Instructions',
    category: 'returns',
    content: `To return your {{product_name}}, please follow these steps:
1. Print the return label from your order history
2. Pack the item in its original packaging if possible
3. Attach the return label to the outside of the package
4. Drop off at any {{carrier_name}} location

You should receive your refund within {{refund_days}} business days after we receive the return.`,
    variables: [
      { name: 'product_name', description: 'Name of the product being returned' },
      { name: 'carrier_name', description: 'Shipping carrier name' },
      { name: 'refund_days', description: 'Number of days for refund processing' }
    ],
    createdBy: 'supervisor-001',
    isShared: true
  },
  {
    id: 'template-003',
    name: 'Double Charge Refund',
    category: 'billing',
    content: "I've confirmed the duplicate charge of {{amount}} on your account and processed an immediate refund (reference {{reference_number}}). Please allow 3-5 business days for it to appear, and I've added a $10 store credit as an apology.",
    variables: [
      { name: 'amount', description: 'Duplicate charge amount' },
      { name: 'reference_number', description: 'Refund transaction reference' }
    ],
    createdBy: 'supervisor-001',
    isShared: false
  }
];

const presets = [
  {
    id: 'preset-precise',
    name: 'Precise & Cautious',
    description: 'Low creativity, escalates early',
    parameters: { temperature: 0.2, max_tokens: 200, top_p: 0.9 },
    escalationThresholds: { lowConfidence: 0.6, negativeSentiment: 0.4, responseTime: 15 },
    createdBy: 'supervisor-001'
  },
  {
    id: 'preset-creative',
    name: 'Conversational',
    description: 'More natural and longer replies',
    parameters: { temperature: 0.8, max_tokens: 300, top_p: 1.0 },
    escalationThresholds: { lowConfidence: 0.3, negativeSentiment: 0.25, responseTime: 25 },
    createdBy: 'supervisor-001'
  }
];

// Two weeks of past conversations so trends, resolution rate and escalation rate have something to show.
// Deterministic (seeded generator) so every seed produces the same history.
function buildHistory() {
  let seed = 20260924;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const names = ['Ava Martin', 'Noah Patel', 'Liam Chen', 'Mia Rossi', 'Ethan Brooks', 'Zoe Kim', 'Omar Haddad', 'Isla Novak', 'Lucas Silva', 'Nina Park'];
  const agentRefs = [
    { id: 'agent-cs-1', name: 'Customer Service Agent' },
    { id: 'agent-cs-2', name: 'Product Specialist Agent' },
    { id: 'agent-cs-3', name: 'Returns Specialist Agent' }
  ];
  const topics = [
    { tag: 'shipping', q: 'My order has not arrived yet, can you check the status?', a: 'I checked the tracking and your package is in transit. I have expedited it for you.' },
    { tag: 'returns', q: 'I want to return an item I bought last week.', a: 'I have started the return and emailed you a prepaid label. Your refund follows within 3-5 business days.' },
    { tag: 'billing', q: 'I think I was charged twice for the same order.', a: 'You are right, I refunded the duplicate charge and added a $10 store credit as an apology.' },
    { tag: 'product', q: 'Is this model compatible with my older device?', a: 'Yes, it is fully compatible. I have linked the setup guide in your order confirmation.' }
  ];
  const out = [];
  for (let day = 1; day <= 14; day++) {
    const perDay = 2 + Math.floor(rand() * 4);
    for (let n = 0; n < perDay; n++) {
      const topic = pick(topics);
      const agent = pick(agentRefs);
      const start = new Date(Date.now() - day * 86400000 + Math.floor(rand() * 9 * 3600000) - 4 * 3600000);
      const escalated = rand() < 0.14;
      const sentiment = Math.round((0.45 + rand() * 0.5 - (escalated ? 0.25 : 0) + day * 0.004) * 100) / 100;
      out.push({
        id: `conv-hist-${day}-${n}`,
        customer: { id: `cust-${2000 + day * 10 + n}`, name: pick(names) },
        agent,
        status: 'resolved',
        alertLevel: 'low',
        startTime: start,
        endTime: new Date(start.getTime() + (6 + Math.floor(rand() * 20)) * 60000),
        metrics: {
          sentiment: Math.min(0.98, Math.max(0.2, sentiment)),
          responseTime: Math.round((7 + rand() * 12) * 10) / 10,
          confidenceScore: Math.round((0.6 + rand() * 0.38) * 100) / 100
        },
        messages: [
          { sender: 'customer', text: topic.q, timestamp: start },
          { sender: 'agent', text: topic.a, timestamp: new Date(start.getTime() + 60000) },
          { sender: 'customer', text: 'Great, thank you for the help.', timestamp: new Date(start.getTime() + 180000) }
        ],
        tags: [topic.tag],
        humanIntervention: escalated
          ? { occurred: true, active: false, supervisorId: 'supervisor-001', timestamp: new Date(start.getTime() + 240000), notes: 'Escalated by customer request' }
          : { occurred: false }
      });
    }
  }
  return out;
}

// Seed function
async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Clear existing data
    await Conversation.deleteMany({});
    await Agent.deleteMany({});
    await KnowledgeBase.deleteMany({});
    await ResponseTemplate.deleteMany({});
    await Preset.deleteMany({});
    
    console.log('Cleared existing data');
    
    // Insert new data
    await Conversation.insertMany(conversations);
    await Conversation.insertMany(buildHistory());
    await Agent.insertMany(agents);
    await KnowledgeBase.insertMany(knowledgeBases);
    await ResponseTemplate.insertMany(templates);
    await Preset.insertMany(presets);
    
    console.log('Data seeded successfully');
    
    // Create indexes
    await Conversation.collection.createIndex({ "id": 1 }, { unique: true });
    await Conversation.collection.createIndex({ "status": 1 });
    await Conversation.collection.createIndex({ "alertLevel": 1 });
    await Conversation.collection.createIndex({ "agent.id": 1 });
    
    await Agent.collection.createIndex({ "id": 1 }, { unique: true });
    await KnowledgeBase.collection.createIndex({ "id": 1 }, { unique: true });
    await ResponseTemplate.collection.createIndex({ "id": 1 }, { unique: true });
    await Preset.collection.createIndex({ "id": 1 }, { unique: true });
    
    console.log('Indexes created');
    
    console.log('Database seeding completed successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run seed function
seedDatabase();