"use client";

import { useActionState } from "react";

import { updateProfileAction, type ProfileFormState } from "@/app/settings/actions";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const initialState: ProfileFormState = { error: null };

export function ProfileForm({ displayName }: { displayName: string }) {
  const [state, formAction, pending] = useActionState(updateProfileAction, initialState);

  return (
    <form action={formAction}>
      <FieldGroup>
        <Field data-invalid={state.error ? true : undefined}>
          <FieldLabel htmlFor="displayName">표시 이름</FieldLabel>
          <Input id="displayName" name="displayName" defaultValue={displayName} maxLength={50} />
          {state.error ? (
            <FieldError>{state.error}</FieldError>
          ) : (
            state.saved && <FieldDescription>저장했습니다.</FieldDescription>
          )}
        </Field>
        <Button type="submit" disabled={pending} className="self-start">
          {pending ? "저장 중…" : "저장"}
        </Button>
      </FieldGroup>
    </form>
  );
}
