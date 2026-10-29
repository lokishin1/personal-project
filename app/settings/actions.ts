"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient, getVerifiedUserId } from "@/lib/supabase/server";

export type ProfileFormState = { error: string | null; saved?: boolean };

export async function updateProfileAction(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/login?next=/settings");

  const displayName = formData.get("displayName")?.toString().trim() ?? "";
  if (displayName.length > 50) return { error: "이름은 50자 이하로 입력해 주세요." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName || null, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) return { error: "저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };

  revalidatePath("/settings");
  return { error: null, saved: true };
}
