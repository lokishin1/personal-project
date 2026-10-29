"use client";

import { useActionState } from "react";

import { signInAction, type AuthFormState } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const initialState: AuthFormState = { error: null };

// 지금은 본인만 쓰는 단계라 가입 화면을 두지 않는다(새 가입은 Supabase에서도 꺼 둔다).
export function SignInForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(signInAction, initialState);

  return (
    <form action={formAction}>
      <FieldGroup>
        <input type="hidden" name="next" value={next} />
        <Field>
          <FieldLabel htmlFor="email">이메일</FieldLabel>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field data-invalid={state.error ? true : undefined}>
          <FieldLabel htmlFor="password">비밀번호</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={state.error ? true : undefined}
          />
          {state.error && <FieldError>{state.error}</FieldError>}
        </Field>
        <Button type="submit" disabled={pending}>
          {pending ? "로그인 중…" : "로그인"}
        </Button>
      </FieldGroup>
    </form>
  );
}
