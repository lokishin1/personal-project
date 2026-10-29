"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { PricePoint } from "@/lib/market-data";

const chartConfig = {
  close: { label: "종가", color: "var(--primary)" },
} satisfies ChartConfig;

export function PriceChart({ points }: { points: PricePoint[] }) {
  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full">
      <AreaChart data={points} margin={{ left: 4, right: 4 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={40} tickMargin={8} />
        <YAxis
          domain={["auto", "auto"]}
          tickLine={false}
          axisLine={false}
          width={56}
          tickFormatter={(value: number) => value.toFixed(0)}
        />
        <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
        <Area
          dataKey="close"
          type="monotone"
          stroke="var(--color-close)"
          fill="var(--color-close)"
          fillOpacity={0.15}
          strokeWidth={2}
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartContainer>
  );
}
