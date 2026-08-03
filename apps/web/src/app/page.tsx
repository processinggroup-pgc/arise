import { validateEnvironment } from "@arise/domain";

export default function HomePage(): React.JSX.Element {
  const validation = validateEnvironment({
    NODE_ENV: process.env["NODE_ENV"],
  });

  return (
    <main>
      <h1>ARISE Studio</h1>
      <p>Governed build agent foundation</p>
      <p data-testid="environment-status">
        {validation.valid ? "Environment valid" : validation.errors.join(", ")}
      </p>
    </main>
  );
}
