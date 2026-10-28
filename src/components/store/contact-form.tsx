"use client";

import { useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";
import { toWhatsAppNumber } from "@/lib/phone";

export function ContactForm({ whatsapp, storeName }: { whatsapp: string | null; storeName: string }) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!whatsapp) return;
    const text = `مرحبًا ${storeName}،\nأنا ${name || "عميل"}.\n${message}`;
    window.open(`https://wa.me/${toWhatsAppNumber(whatsapp)}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  if (!whatsapp) {
    return (
      <div className="rounded-xl border border-line bg-ink-900/60 p-4 text-xs leading-6 text-slate-400">
        لم يتم إعداد رقم واتساب للمتجر بعد. يمكنك التواصل عبر بيانات الاتصال الظاهرة في الصفحة، أو من خلال صفحة
        «تتبع الطلب» إذا كان استفسارك عن طلب حالي.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="contact-name">اسمك</Label>
        <Input id="contact-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="اسمك الكريم" />
      </div>
      <div>
        <Label htmlFor="contact-message">رسالتك</Label>
        <Textarea
          id="contact-message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          required
          minLength={5}
          placeholder="اكتب استفسارك عن منتج أو طلب أو خدمة التجميع…"
        />
      </div>
      <Button type="submit" className="w-full">
        <Send className="h-4 w-4" />
        إرسال عبر واتساب
      </Button>
      <p className="flex items-center gap-1.5 text-[10px] text-slate-500">
        <MessageCircle className="h-3 w-3" />
        سيُفتح واتساب برسالتك جاهزة للإرسال. لا نحتفظ بمحتوى الرسالة على الموقع.
      </p>
    </form>
  );
}
