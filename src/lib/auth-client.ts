import { createAuthClient } from "better-auth/client";
import { anonymous } from "better-auth/plugins";

export const authClient = createAuthClient({
  plugins: [anonymous()],
});
