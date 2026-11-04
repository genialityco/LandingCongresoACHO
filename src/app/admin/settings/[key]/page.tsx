"use client";

import { notFound } from "next/navigation";
import { use } from "react";
import { SettingsEditor } from "@/components/admin/settings/SettingsEditor";
import { SETTINGS_KEYS, type SettingsKey } from "@/lib/model/settings";

export default function SettingsPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = use(params);
  if (!SETTINGS_KEYS.includes(key as SettingsKey)) notFound();
  return <SettingsEditor key={key} settingsKey={key as SettingsKey} />;
}
