export {
  VercelApiError,
  vercelApiRequest,
  type VercelApiClientConfig,
} from "./vercel-api-client.js";
export {
  FakeVercelProjectAdapter,
} from "./fake-vercel-project-adapter.js";
export {
  HttpVercelProjectAdapter,
} from "./http-vercel-project-adapter.js";
export {
  DisabledVercelPreviewAdapter,
  HttpVercelPreviewAdapter,
} from "./http-vercel-preview-adapter.js";
export {
  VercelPreviewError,
  type CreateVercelPreviewRequest,
  type ReadVercelDeploymentRequest,
  type VercelDeploymentRecord,
  type VercelPreviewPort,
} from "./vercel-preview-port.js";
export {
  FakeVercelPreviewAdapter,
  type FakeVercelDeploymentFixture,
} from "./fake-vercel-preview-adapter.js";
export {
  VercelProjectError,
  type CreateVercelProjectRequest,
  type ValidateVercelCredentialsRequest,
  type VercelGitRepositoryLink,
  type VercelProjectEnvironmentVariable,
  type VercelProjectPort,
  type VercelProjectRecord,
} from "./vercel-project-port.js";
