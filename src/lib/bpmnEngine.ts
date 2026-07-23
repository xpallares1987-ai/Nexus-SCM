export type ShipmentStatus = 'Draft' | 'Booked' | 'InTransit' | 'Arrived' | 'CustomsCleared' | 'Delivered';
export type ShipmentEvent = 'SUBMIT_BOOKING' | 'DEPART' | 'ARRIVE' | 'CLEAR_CUSTOMS' | 'DELIVER' | 'CANCEL_BOOKING';

export interface WorkflowTransition {
  from: string;
  event: string;
  to: string;
}

export interface WorkflowDefinition {
  name: string;
  initialState: string;
  transitions: WorkflowTransition[];
}

export const shipmentWorkflow: WorkflowDefinition = {
  name: 'ShipmentBookingExecution',
  initialState: 'Draft',
  transitions: [
    { from: 'Draft', event: 'SUBMIT_BOOKING', to: 'Booked' },
    { from: 'Booked', event: 'DEPART', to: 'InTransit' },
    { from: 'Booked', event: 'CANCEL_BOOKING', to: 'Draft' },
    { from: 'InTransit', event: 'ARRIVE', to: 'Arrived' },
    { from: 'Arrived', event: 'CLEAR_CUSTOMS', to: 'CustomsCleared' },
    { from: 'Arrived', event: 'DELIVER', to: 'Delivered' },
    { from: 'CustomsCleared', event: 'DELIVER', to: 'Delivered' },
  ]
};

/**
 * Basic BPMN Workflow engine stub for shipment booking and execution.
 * Validates transitions based on BPMN flow logic using a configurable state machine.
 */
export function executeBookingWorkflow(currentStatus: string, event: ShipmentEvent): ShipmentStatus {
  const transition = shipmentWorkflow.transitions.find(
    t => t.from === currentStatus && t.event === event
  );

  if (currentStatus === 'Delivered') {
    throw new Error(`Shipment is already delivered.`);
  }

  if (transition) {
    return transition.to as ShipmentStatus;
  }

  throw new Error(`Invalid BPMN event '${event}' for current status '${currentStatus}'.`);
}

/**
 * Helper to determine the implied BPMN event based on a target status change.
 */
export function getEventForTransition(currentStatus: string, targetStatus: string): ShipmentEvent | null {
  const transition = shipmentWorkflow.transitions.find(
    t => t.from === currentStatus && t.to === targetStatus
  );
  
  return transition ? (transition.event as ShipmentEvent) : null;
}
