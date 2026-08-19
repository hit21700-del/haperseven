"use client";
import React from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";

/** 파괴적 액션 확인 다이얼로그 (window.confirm 대체) */
export function ConfirmDialog({
  open,
  title = "확인",
  message,
  confirmLabel = "삭제",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title?: string;
  message: React.ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            취소
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-gray-600">{message}</p>
    </Modal>
  );
}
