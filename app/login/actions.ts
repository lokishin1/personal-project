"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type AuthFormState = { error: string | null; notice?: string };

// 외부 주소로 보내지 않도록 앱 안의 경로만 허용한다.
function safeNext(value: FormDataEntryValue | null): string {
  const next = value?.toString() ?? "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/trades";
}

function readCredentials(formData: FormData) {
  return {
    email: formData.get("email")?.toString().trim() ?? "",
    password: formData.get("password")?.toString() ?? "",
  };
}

export async function signInAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const { email, password } = readCredentials(formData);
  if (!email || !password) return { error: "이메일과 비밀번호를 입력해 주세요." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "이메일 또는 비밀번호가 맞지 않습니다." };

  revalidatePath("/", "layout");
  redirect(safeNext(formData.get("next")));
}

export async function signUpAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const { email, password } = readCredentials(formData);
  if (!email || !password) return { error: "이메일과 비밀번호를 입력해 주세요." };
  if (password.length < 6) return { error: "비밀번호는 6자 이상이어야 합니다." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.code === "user_already_exists" ? "이미 가입된 이메일입니다." : "가입하지 못했습니다. 잠시 후 다시 시도해 주세요." };

  // 이메일 확인이 켜져 있으면 세션 없이 돌아온다.
  if (!data.session) return { error: null, notice: "확인 메일을 보냈습니다. 메일의 링크를 누른 뒤 로그인해 주세요." };

  revalidatePath("/", "layout");
  redirect(safeNext(formData.get("next")));
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
