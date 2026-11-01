import type { Metadata } from "next";
import { VerificationFlow } from "../../components/verification-flow";
export const metadata: Metadata = {
  title: "Verify on your device",
  description:
    "Try bundled samples or choose local inputs. Inspect every score and decision.",
};
export default function Verify() {
  return <VerificationFlow />;
}
