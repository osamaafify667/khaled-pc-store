"use client";

import { useActionState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { createAdminUserAction, type UserAdminState } from "@/actions/admin/users";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Select } from "@/components/ui/field";

export function UserCreateForm() {
  const [state, action, pending] = useActionState<UserAdminState, FormData>(createAdminUserAction, {});

  return (
    <form action={action} className="space-y-3">
      {state.ok ? <Alert tone="success">{state.message}</Alert> : null}
      {state.error && !state.ok ? <Alert tone="error">{state.error}</Alert> : null}

      <div>
        <Label htmlFor="user-name">الاسم *</Label>
        <Input id="user-name" name="name" required />
        <FieldError message={state.fieldErrors?.name} />
      </div>
      <div>
        <Label htmlFor="user-email">البريد الإلكتروني *</Label>
        <Input id="user-email" name="email" type="email" required dir="ltr" />
        <FieldError message={state.fieldErrors?.email} />
      </div>
      <div>
        <Label htmlFor="user-password">كلمة المرور المؤقتة *</Label>
        <Input id="user-password" name="password" type="password" required minLength={8} dir="ltr" autoComplete="new-password" />
        <FieldError message={state.fieldErrors?.password} />
      </div>
      <div>
        <Label htmlFor="user-role">الدور</Label>
        <Select id="user-role" name="role" defaultValue="ADMIN">
          <option value="ADMIN">إداري</option>
          <option value="CUSTOMER">عميل</option>
        </Select>
      </div>
      <p className="text-[10px] leading-5 text-slate-500">
        سلّم كلمة المرور للمستخدم بطريقة آمنة واطلب منه تغييرها فورًا. لا توجد كلمة مرور افتراضية في الإنتاج.
      </p>
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
        {pending ? "جارٍ الإنشاء…" : "إنشاء المستخدم"}
      </Button>
    </form>
  );
}
