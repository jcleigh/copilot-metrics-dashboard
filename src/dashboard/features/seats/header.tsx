import { PageHeader, PageTitle } from "../page-header/page-header";
import { DateFilter } from "./filters/date-filter";

interface HeaderProps {
  title: string;
  isDynamoDb?: boolean;
}

export const Header = ({ title, isDynamoDb: isDynamoDb }: HeaderProps) => {
  return (
    <PageHeader>
      <PageTitle>{title}</PageTitle>
      <div className="flex gap-8 justify-between flex-col md:flex-row">
        <div className="flex gap-2">
          <DateFilter disabled={!isDynamoDb} />
        </div>
      </div>
    </PageHeader>
  );
};
