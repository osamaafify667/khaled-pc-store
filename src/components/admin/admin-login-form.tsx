"use client";

import { useActionState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { adminLoginAction, type AuthState } from "@/actions/auth";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/field";

export function AdminLoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(adminLoginAction, {});

  return (
    <form action={action} className="surface p-6" noValidate>
      {state.error ? (
        <Alert tone="error" className="mb-5">
          {state.error}
        </Alert>
      ) : null}

      {next ? <input type="hidden" name="next" value={next} /> : null}

      <div>
        <Label htmlFor="password">كلمة مرور لوحة التحكم</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          autoFocus
          required
          dir="ltr"
          placeholder="••••••••"
        />
        <FieldError message={state.fieldErrors?.password} />
      </div>

      <Button type="submit" className="mt-6 w-full" size="lg" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
        {pending ? "جارٍ التحقق…" : "دخول لوحة التحكم"}
      </Button>
    </form>
  );
}
