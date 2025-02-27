import Dashboard, { IProps } from "@/features/dashboard/dashboard-page";
import { Suspense } from "react";
import Loading from "./loading";
import { ensureDatabaseInitialized } from "@/services/db-init";

// Initialize the local database on server startup
export const initDatabase = async () => {
  ensureDatabaseInitialized();
  // Database initialization is complete
  return { success: true };
};

export const dynamic = "force-dynamic";
export default async function Home(props: IProps) {
  // Ensure database is initialized when the app starts
  await initDatabase();
  
  let id = "initial-dashboard";

  if (props.searchParams.startDate && props.searchParams.endDate) {
    id = `${id}-${props.searchParams.startDate}-${props.searchParams.endDate}`;
  }

  return (
    <Suspense fallback={<Loading />} key={id}>
      <Dashboard {...props} />
    </Suspense>
  );
}
