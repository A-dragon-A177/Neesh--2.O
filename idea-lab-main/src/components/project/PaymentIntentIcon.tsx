import { useState, useEffect } from "react";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import apiClient from "@/lib/api";
import { toast } from "@/hooks/use-toast";

interface PaymentIntentIconProps {
  projectId: string;
  earlyAccessPrice: number | null;
  projectTitle: string;
  userName?: string;
  userEmail?: string;
  isSignedIn: boolean;
  authLoading: boolean;
  onRequireSignIn: () => void;
}

const PaymentIntentIcon = (_props: PaymentIntentIconProps) => {
  return null;
};

export default PaymentIntentIcon;

