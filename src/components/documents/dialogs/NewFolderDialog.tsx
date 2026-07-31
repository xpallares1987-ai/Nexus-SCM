import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/overlays/dialog';
import { Button } from '@/components/ui/forms/button';
import { Input } from '@/components/ui/forms/input';
import { Label } from '@/components/ui/forms/label';
import { FolderPlus } from 'lucide-react';

interface NewFolderDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  newFolderName: string;
  setNewFolderName: (name: string) => void;
  onCreateFolder: (e: React.FormEvent) => void;
}

export function NewFolderDialog({
  isOpen,
  onOpenChange,
  newFolderName,
  setNewFolderName,
  onCreateFolder,
}: NewFolderDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-indigo-500" /> Create New Folder
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onCreateFolder} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Folder Name</Label>
            <Input
              placeholder="e.g. Project Alpha, FY2024"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              autoFocus
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-indigo-600 text-white hover:bg-indigo-700">
              Create Folder
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
