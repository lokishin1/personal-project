"use client";

import { useActionState } from "react";

import { signInAction, signUpAction, type AuthFormState } from "@/app/login/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const initialState: AuthFormState = { error: null };

function CredentialsForm({
  action,
  submitLabel,
  next,
  passwordAutoComplete,
}: {
  action: (prev: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  submitLabel: string;
  next: string;
  passwordAutoComplete: "current-password" | "new-password";
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction}>
      <FieldGroup>
        <input type="hidden" name="next" value={next} />
        <Field>
          <FieldLabel htmlFor={`${submitLabel}-email`}>이메일</FieldLabel>
          <Input id={`${submitLabel}-email`} name="email" type="email" autoComplete="email" required />
        </Field>
        <Field data-invalid={state.error ? true : undefined}>
          <FieldLabel htmlFor={`${submitLabel}-password`}>비밀번호</FieldLabel>
          <Input
            id={`${submitLabel}-password`}
            name="password"
            type="password"
            autoComplete={passwordAutoComplete}
            minLength={6}
            required
            aria-invalid={state.error ? true : undefined}
          />
          {state.error && <FieldError>{state.error}</FieldError>}
        </Field>
        {state.notice && (
          <Alert>
            <AlertDescription>{state.notice}</AlertDescription>
          </Alert>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? "처리 중…" : submitLabel}
        </Button>
      </FieldGroup>
    </form>
  );
}

export function AuthForms({ next }: { next: string }) {
  return (
    <Tabs defaultValue="sign-in" className="w-full">
      <TabsList className="w-full">
        <TabsTrigger value="sign-in">로그인</TabsTrigger>
        <TabsTrigger value="sign-up">가입</TabsTrigger>
      </TabsList>
      <TabsContent value="sign-in" className="pt-4">
        <CredentialsForm action={signInAction} submitLabel="로그인" next={next} passwordAutoComplete="current-password" />
      </TabsContent>
      <TabsContent value="sign-up" className="pt-4">
        <CredentialsForm action={signUpAction} submitLabel="가입" next={next} passwordAutoComplete="new-password" />
      </TabsContent>
    </Tabs>
  );
}
