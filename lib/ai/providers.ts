import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';
import { isTestEnvironment } from '../constants';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

const openRouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export const myProvider = isTestEnvironment
  ? customProvider({
      languageModels: {
        'chat-model': chatModel,
        'chat-model-reasoning': reasoningModel,
        'title-model': titleModel,
        'artifact-model': artifactModel,
      },
    })
  : customProvider({
      languageModels: {
        'chat-model': openRouter('google/gemini-2.0-flash-001'),
        'chat-model-reasoning': wrapLanguageModel({
          model: openRouter('google/gemini-2.0-flash-001'),
          middleware: extractReasoningMiddleware({ tagName: 'think' }),
        }),
        'title-model': openRouter('google/gemini-2.0-flash-001'),
        'artifact-model': openRouter('google/gemini-2.0-flash-001'),
      },
      // imageModels: {
      //   'small-model': xai.image('grok-2-image'),
      // },
    });
