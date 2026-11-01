import { redirect } from "next/navigation";

// Project versioning has been retired from the teacher workflow.
// Keep the old URL safe for bookmarks and redirect users to the dashboard.
export default function RetiredProjectVersionsPage() {
  redirect("/admin");
}
