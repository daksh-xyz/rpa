import { useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, ArrowLeft, Play, Save } from 'lucide-react';
import WorkflowStepComponent from '../../components/WorkflowStep';
import RealCloudBrowser from '../../components/RealCloudBrowser';
import WorkflowManager from '../../components/WorkflowManager';
import StepSelector from '../../components/StepSelector';
import { useWorkflowContext } from '../../contexts/WorkflowContext';
import { type WorkflowStep, type StepType } from '../../types/workflow';
import { API_ENDPOINTS } from '../../config/api';

type ViewMode = 'workflows' | 'editor';

export default function AutomationPage() {
  const { currentWorkflow, updateWorkflow, addStep, updateStep, deleteStep, reorderSteps, loadWorkflow } = useWorkflowContext();
  const [viewMode, setViewMode] = useState<ViewMode>('workflows');
  const [isExecuting, setIsExecuting] = useState(false);
  const [showStepSelector, setShowStepSelector] = useState(false);
  const [executionResults, setExecutionResults] = useState<any[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && currentWorkflow) {
      const oldIndex = currentWorkflow.steps.findIndex((item) => item.id === active.id.toString());
      const newIndex = currentWorkflow.steps.findIndex((item) => item.id === over.id.toString());
      
      reorderSteps(currentWorkflow.id, oldIndex, newIndex);
    }
  };

  const handleStepUpdate = (updatedStep: WorkflowStep) => {
    if (currentWorkflow) {
      updateStep(currentWorkflow.id, updatedStep.id, updatedStep);
    }
  };

  const handleStepDelete = (stepId: string) => {
    if (currentWorkflow) {
      deleteStep(currentWorkflow.id, stepId);
    }
  };

  const handleAddStep = (stepType: StepType) => {
    if (!currentWorkflow) return;

    const stepTitles = {
      navigate: 'Navigate to URL',
      click: 'Click Element',
      type: 'Type Text',
      wait: 'Wait',
      screenshot: 'Take Screenshot'
    };

    const stepDescriptions = {
      navigate: 'Navigate to a specific URL',
      click: 'Click on an element using XPath',
      type: 'Type text into an input field using XPath',
      wait: 'Wait for a specified duration',
      screenshot: 'Capture a screenshot of the current page'
    };

    const newStep: Omit<WorkflowStep, 'id' | 'order'> = {
      type: stepType.type,
      title: stepTitles[stepType.type],
      description: stepDescriptions[stepType.type],
      config: {}
    };

    addStep(currentWorkflow.id, newStep);
  };

  const handleWorkflowSelect = (workflowId: string) => {
    loadWorkflow(workflowId);
    setViewMode('editor');
  };

  const handleRunStep = async (stepId: string) => {
    if (!currentWorkflow) return;
    
    const step = currentWorkflow.steps.find(s => s.id === stepId);
    if (!step) return;

    setIsExecuting(true);
    
    try {
      const response = await fetch(API_ENDPOINTS.executeStep, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(step),
      });

      if (!response.ok) {
        throw new Error('Failed to execute step');
      }

      const result = await response.json();
      setExecutionResults(prev => [...prev, { stepId, result, timestamp: new Date().toISOString() }]);
    } catch (error) {
      console.error('Error executing step:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleRunWorkflow = async () => {
    if (!currentWorkflow) return;

    setIsExecuting(true);
    setExecutionResults([]);
    
    try {
      const response = await fetch(API_ENDPOINTS.executeWorkflow, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps: currentWorkflow.steps }),
      });

      if (!response.ok) {
        throw new Error('Failed to execute workflow');
      }

      const result = await response.json();
      setExecutionResults(result.results || []);
    } catch (error) {
      console.error('Error executing workflow:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleBrowserControl = (action: string, data?: unknown) => {
    console.log('Browser control action:', action, data);
    
    switch (action) {
      case 'run_workflow':
        handleRunWorkflow();
        break;
      case 'pause_workflow':
        setIsExecuting(false);
        break;
      case 'stop_workflow':
        setIsExecuting(false);
        break;
      case 'reset_browser':
        setIsExecuting(false);
        setExecutionResults([]);
        break;
      case 'take_control':
        console.log('Browser control taken');
        break;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">RPA Automation</h1>
            <p className="text-gray-600">Build and monitor your automation workflows with XPath-based interactions</p>
          </div>
          
          {viewMode === 'editor' && currentWorkflow && (
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setViewMode('workflows')}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                <ArrowLeft size={16} />
                <span>Back to Workflows</span>
              </button>
              <button
                onClick={handleRunWorkflow}
                disabled={isExecuting || currentWorkflow.steps.length === 0}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Play size={16} />
                <span>Run Workflow</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {viewMode === 'workflows' ? (
          <WorkflowManager onWorkflowSelect={handleWorkflowSelect} />
        ) : currentWorkflow ? (
          <div className="flex h-[calc(100vh-140px)] gap-6">
            {/* Left Panel - Steps */}
            <div className="w-1/2 overflow-y-auto">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {currentWorkflow.name}
                </h2>
                <p className="text-gray-600 mb-4">
                  {currentWorkflow.description || 'No description'}
                </p>
                <button
                  onClick={() => setShowStepSelector(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                >
                  <Plus size={16} />
                  <span>Add Step</span>
                </button>
              </div>

              {currentWorkflow.steps.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <div className="text-6xl mb-4">🚀</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Steps Yet</h3>
                  <p className="text-gray-600 mb-4">
                    Add your first step to start building your automation workflow
                  </p>
                  <button
                    onClick={() => setShowStepSelector(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors mx-auto"
                  >
                    <Plus size={16} />
                    <span>Add Your First Step</span>
                  </button>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={currentWorkflow.steps.map(step => step.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {currentWorkflow.steps.map((step) => (
                      <WorkflowStepComponent
                        key={step.id}
                        step={step}
                        onUpdate={handleStepUpdate}
                        onDelete={handleStepDelete}
                        onAddStep={() => setShowStepSelector(true)}
                        onRun={handleRunStep}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              )}
            </div>

            {/* Right Panel - Real Cloud Browser */}
            <div className="w-1/2">
              <RealCloudBrowser
                isExecuting={isExecuting}
                onBrowserControl={handleBrowserControl}
              />
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Workflow Selected</h2>
            <p className="text-gray-600">Please select a workflow to edit</p>
          </div>
        )}
      </div>

      {/* Step Selector Modal */}
      <StepSelector
        isOpen={showStepSelector}
        onClose={() => setShowStepSelector(false)}
        onStepSelect={handleAddStep}
      />
    </div>
  );
}