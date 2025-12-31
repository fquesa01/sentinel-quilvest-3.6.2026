type Topic = {
  name: string;
  size: number;
  color: string;
};

type Props = {
  topics: Topic[];
};

export function TopicBubbles({ topics }: Props) {
  const maxSize = Math.max(...topics.map(t => t.size));

  return (
    <div className="flex flex-wrap gap-3 items-center justify-center py-4">
      {topics.map((topic, i) => {
        const scale = 0.5 + (topic.size / maxSize) * 0.5;
        const size = 60 + scale * 40;

        return (
          <div
            key={i}
            className="flex items-center justify-center rounded-full text-white text-xs font-medium shadow-md hover:scale-110 transition-transform cursor-pointer"
            style={{
              width: size,
              height: size,
              backgroundColor: topic.color,
            }}
            data-testid={`topic-bubble-${i}`}
          >
            <span className="text-center px-2">{topic.name}</span>
          </div>
        );
      })}
    </div>
  );
}
