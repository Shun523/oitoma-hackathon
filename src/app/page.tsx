import { PublicTop } from '@/components/PublicTop';
import published from '@/data/published.json';
import type { PublishedData } from '@/lib/types';

export default function TopPage(): React.JSX.Element {
  return <PublicTop data={published as PublishedData} />;
}
