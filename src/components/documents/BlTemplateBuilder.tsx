import React from 'react';
import { Button } from '@/components/ui/forms/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/forms/select';
import { Input } from '@/components/ui/forms/input';
import { Plus, Trash2, GripVertical, Type, Database, LayoutTemplate } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export type TemplateBlock = {
  id: string;
  type: 'variable' | 'text';
  value: string;
};

interface BlTemplateBuilderProps {
  blocks: TemplateBlock[];
  onChange: (blocks: TemplateBlock[]) => void;
}

function SortableBlock({ block, updateBlock, removeBlock }: { block: TemplateBlock, updateBlock: (id: string, val: string) => void, removeBlock: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: block.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 bg-card p-2 border rounded-md shadow-sm mb-2 relative group">
      <div {...attributes} {...listeners} className="cursor-grab hover:text-foreground text-muted-foreground p-1 flex-shrink-0">
        <GripVertical className="w-4 h-4" />
      </div>
      
      {block.type === 'variable' ? (
        <Database className="w-4 h-4 text-blue-500 shrink-0" />
      ) : (
        <Type className="w-4 h-4 text-green-500 shrink-0" />
      )}
      
      {block.type === 'variable' ? (
        <Select value={block.value} onValueChange={(val) => updateBlock(block.id, val)}>
          <SelectTrigger className="flex-1 bg-background"><SelectValue placeholder="Select a field" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="companyName">Company Name</SelectItem>
            <SelectItem value="addressLine1">Address Line 1</SelectItem>
            <SelectItem value="addressLine2">Address Line 2</SelectItem>
            <SelectItem value="city">City</SelectItem>
            <SelectItem value="state">State / Province</SelectItem>
            <SelectItem value="postalCode">Postal Code</SelectItem>
            <SelectItem value="country">Country</SelectItem>
            <SelectItem value="contactName">Primary Contact Name</SelectItem>
            <SelectItem value="contactPhone">Primary Contact Phone</SelectItem>
            <SelectItem value="contactEmail">Primary Contact Email</SelectItem>
            <SelectItem value="taxId">Tax/VAT ID</SelectItem>
            <SelectItem value="eori">EORI Number</SelectItem>
            <SelectItem value="newline">-- Line Break --</SelectItem>
          </SelectContent>
        </Select>
      ) : (
        <Input 
          value={block.value} 
          onChange={(e) => updateBlock(block.id, e.target.value)} 
          placeholder="Custom text or prefix (e.g. 'VAT: ')"
          className="flex-1 bg-background"
        />
      )}
      
      <Button type="button" variant="ghost" size="icon" onClick={() => removeBlock(block.id)} className="shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50">
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}

export function BlTemplateBuilder({ blocks, onChange }: BlTemplateBuilderProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const addBlock = (type: 'variable' | 'text') => {
    const newBlock: TemplateBlock = { 
      id: Math.random().toString(36).substring(7), 
      type, 
      value: type === 'variable' ? 'companyName' : '' 
    };
    onChange([...blocks, newBlock]);
  };

  const updateBlock = (id: string, value: string) => {
    onChange(blocks.map(b => b.id === id ? { ...b, value } : b));
  };

  const removeBlock = (id: string) => {
    onChange(blocks.filter(b => b.id !== id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex(b => b.id === active.id);
      const newIndex = blocks.findIndex(b => b.id === over.id);
      onChange(arrayMove(blocks, oldIndex, newIndex));
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-muted p-4 rounded-lg border border-border">
        <div className="flex items-center gap-2 mb-4 text-sm font-medium text-muted-foreground">
          <LayoutTemplate className="w-4 h-4" />
          Dynamic Format Builder
        </div>
        
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
            <div className="min-h-[100px]">
              {blocks.map(block => (
                <SortableBlock 
                  key={block.id} 
                  block={block} 
                  updateBlock={updateBlock} 
                  removeBlock={removeBlock} 
                />
              ))}
              {blocks.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-8 border-2 border-dashed border-border rounded-md bg-background">
                  No fields added. Build your template by adding data fields or text below.
                </div>
              )}
            </div>
          </SortableContext>
        </DndContext>
        
        <div className="flex gap-2 mt-4 pt-4 border-t border-border">
          <Button type="button" variant="outline" size="sm" onClick={() => addBlock('variable')} className="bg-card">
            <Plus className="w-4 h-4 mr-2" /> Add Data Field
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => addBlock('text')} className="bg-card">
            <Plus className="w-4 h-4 mr-2" /> Add Custom Text
          </Button>
        </div>
      </div>
    </div>
  );
}
