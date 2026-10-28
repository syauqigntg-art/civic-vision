import { redirect } from "next/navigation";

// Retired by product decision: content is managed directly from the selected project.
export default function RetiredProjectVersionsPage() {
  redirect("/admin");
}
