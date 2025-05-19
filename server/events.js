export const Events = {
  JOIN: 'join',
  LEAVE: 'leave',
  UPDATE: 'update'
};

export const Schemas = {
  [Events.JOIN]: {
    type: 'object',
    properties: {
      userId: { type: 'string' }
    },
    required: ['userId'],
    additionalProperties: false
  },
  [Events.LEAVE]: {
    type: 'object',
    properties: {
      userId: { type: 'string' }
    },
    required: ['userId'],
    additionalProperties: false
  },
  [Events.UPDATE]: {
    type: 'object',
    properties: {
      userId: { type: 'string' },
      content: { type: 'string' }
    },
    required: ['userId', 'content'],
    additionalProperties: false
  }
};
