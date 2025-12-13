import { FeederCard } from '@/components/feeder-card';
import { mockFeeders } from '@/lib/data';

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Here's an overview of your pet feeders.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {mockFeeders.map((feeder) => (
          <FeederCard key={feeder.id} feeder={feeder} />
        ))}
      </div>
    </div>
  );
}
