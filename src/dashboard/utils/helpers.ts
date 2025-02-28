import { featuresEnvConfig } from "@/services/env-service";
import { format, startOfWeek, parse, isValid } from "date-fns";
import { CopilotMetrics, CopilotUsageOutput, Breakdown } from "@/features/common/models";

export const applyTimeFrameLabel = (
  data: CopilotMetrics[]
): CopilotUsageOutput[] => {
  // Sort data by recordDate or date
  const sortedData = data.sort(
    (a, b) => {
      const dateA = new Date(a.recordDate ?? a.date ?? "").getTime();
      const dateB = new Date(b.recordDate ?? b.date ?? "").getTime();
      return dateA - dateB;
    }
  );

  const dataWithTimeFrame: CopilotUsageOutput[] = [];

  sortedData.forEach((item) => {
    // Convert recordDate or date to a Date object and find the start of its week
    const dateStr = item.recordDate ?? item.date ?? "";
    if (!dateStr) return; // Skip items without a date
    
    const date = new Date(dateStr);
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });

    // Create a unique week identifier
    const weekIdentifier = format(weekStart, "MMM dd");
    const monthIdentifier = format(date, "MMM yy");

    // Create a breakdown array
    let breakdowns: Breakdown[] = [];

    item.copilot_ide_code_completions?.editors?.forEach(editor => {
      editor.models?.forEach(model => {
        model.languages?.forEach(language => {
          breakdowns.push({
            language: language.name,
            editor: editor.name,
            model: model.name,
            suggestions_count: language.total_code_suggestions ?? 0,
            acceptances_count: language.total_code_acceptances ?? 0,
            lines_suggested: language.total_code_lines_suggested ?? 0,
            lines_accepted: language.total_code_lines_accepted ?? 0,
            active_users: language.total_engaged_users,
          });
        });
      });
    });

    // Create new usage output with time frame labels
    const usageOutput: CopilotUsageOutput = {
      ...item,
      day: dateStr,
      time_frame_week: weekIdentifier,
      time_frame_month: monthIdentifier,
      time_frame_display: `${weekIdentifier}, ${monthIdentifier}`,
      total_ide_engaged_users: item.copilot_ide_code_completions?.total_engaged_users ?? 0,
      total_code_suggestions: breakdowns.reduce((acc, curr) => acc + curr.suggestions_count, 0),
      total_code_acceptances: breakdowns.reduce((acc, curr) => acc + curr.acceptances_count, 0),
      total_code_lines_suggested: breakdowns.reduce((acc, curr) => acc + curr.lines_suggested, 0),
      total_code_lines_accepted: breakdowns.reduce((acc, curr) => acc + curr.lines_accepted, 0),
      total_chat_engaged_users: (item.copilot_ide_chat?.total_engaged_users ?? 0) + (item.copilot_dotcom_chat?.total_engaged_users ?? 0),
      total_chats: item.copilot_dotcom_chat?.models?.reduce((acc, curr) => acc + (curr.total_chats ?? 0), 0) ?? 0,
      total_chat_insertion_events: item.copilot_dotcom_chat?.models?.reduce((acc, curr) => acc + (curr.total_chat_insertion_events ?? 0), 0) ?? 0,
      total_chat_copy_events: item.copilot_dotcom_chat?.models?.reduce((acc, curr) => acc + (curr.total_chat_copy_events ?? 0), 0) ?? 0,
      breakdown: breakdowns
    };

    dataWithTimeFrame.push(usageOutput);
  });

  return dataWithTimeFrame;
};

export const getFeatures = () => {
  const features = featuresEnvConfig();
  if (features.status !== "OK") {
    return {
      dashboard: true,
      seats: true
    }
  }
  return features.response;
}

export const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

export const parseDate = (dateStr: string | null) => {
  if (!dateStr) return null;
  const parsed = parse(dateStr, 'yyyy-MM-dd', new Date());
  return isValid(parsed) ? parsed : null;
};

export const stringIsNullOrEmpty = (str: string | null | undefined) => {
  return str === null || str === undefined || str === "";
};

export const getNextUrlFromLinkHeader = (linkHeader: string | null): string | null => {
  if (!linkHeader) return null;

  const links = linkHeader.split(',');
  for (const link of links) {
    const match = link.match(/<([^>]+)>;\s*rel="([^"]+)"/);
    if (match && match[2] === 'next') {
      return match[1];
    }
  }
  return null;
}