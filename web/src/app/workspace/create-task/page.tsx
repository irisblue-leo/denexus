"use client";

import { useTranslations } from "next-intl";
import { Users, Plus } from "lucide-react";

export default function CreateTaskPage() {
  const t = useTranslations("workspace");

  return (
    <div className="p-6 h-screen">
      <div className="bg-white dark:bg-card rounded-2xl border border-border h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center">
            <Users className="w-10 h-10 text-primary-400" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">{t("createTask")}</h2>
          <p className="text-muted-foreground mb-6">Create influencer cooperation tasks</p>
          <button className="px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white font-semibold rounded-xl transition-all flex items-center gap-2 mx-auto">
            <Plus className="w-4 h-4" />
            {t("createTask")}
          </button>
        </div>
      </div>
    </div>
  );
}
