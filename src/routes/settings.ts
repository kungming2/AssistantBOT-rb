import { Hono } from 'hono';
import { validateDiscordWebhookUrl } from '../core/artemisDiscord';

type SettingsValidationRequest = {
  value?: unknown;
};

type SettingsValidationResponse =
  | {
      success: true;
    }
  | {
      success: false;
      error: string;
    };

export const settingsRoutes = new Hono();

settingsRoutes.post('/validate-discord-webhook-url', async (c) => {
  const input = await c.req.json<SettingsValidationRequest>();
  const error = validateDiscordWebhookUrl(input.value);
  if (error) {
    return c.json<SettingsValidationResponse>({ success: false, error }, 200);
  }

  return c.json<SettingsValidationResponse>({ success: true }, 200);
});
