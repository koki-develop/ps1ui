import type { Meta, StoryObj } from "@storybook/react-vite";
import { useId } from "react";

import { Button } from "../Button/Button";
import { Stack } from "../Stack/Stack";
import { Text } from "../Text/Text";
import { Card } from "./Card";

const meta = {
  title: "Components/Card",
  component: Card,
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    style: { maxWidth: 360 },
    children: (
      <>
        <Text as="div" variant="accent" weight="semibold" style={{ marginBottom: 6 }}>
          welcome to ps1ui
        </Text>
        <Text as="p" variant="muted" style={{ marginBottom: 18 }}>
          A dev-focused React UI kit. Monospace type, dark ground, single-stroke lines.
        </Text>
        <Stack direction="row" gap="sm">
          <Button variant="primary">try it</Button>
          <Button variant="secondary">docs</Button>
        </Stack>
      </>
    ),
  },
};

export const Empty: Story = {
  args: {
    style: { maxWidth: 360 },
    children: "any content, wrapped in the surface.",
  },
};

export const LabelledRegion: Story = {
  render: () => {
    const titleId = useId();
    return (
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- documents the labelled-region pattern; Card is intentionally a bare <div>.
      <Card role="region" aria-labelledby={titleId} style={{ maxWidth: 360 }}>
        <Text as="div" id={titleId} variant="accent" weight="semibold" style={{ marginBottom: 6 }}>
          section heading
        </Text>
        <Text as="p" variant="muted">
          Card can be given a landmark role plus an aria-labelledby target to become a labelled
          region.
        </Text>
      </Card>
    );
  },
};
