/**
 * @fileoverview Conditional Edge Component
 * This component renders custom edges between nodes in the workflow graph.
 * It supports different visual styles based on condition types (success, error, always).
 * 
 * Key features:
 * - Custom edge styling
 * - Condition-based coloring
 * - Interactive edge labels
 * - Path calculation and rendering
 * 
 * @module ConditionalEdge
 * @requires ReactFlow
 * @requires workflowStore
 */

import React, { useState, useRef, useEffect } from "react";
import { EdgeProps, getBezierPath } from "reactflow";
import { useWorkflowStore } from "../store/workflowStore";

export type ConditionType = 'success' | 'error' | 'always';

export default function ConditionalEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps) {
  const [edgeCondition, setEdgeCondition] = useState<ConditionType>(
    data?.condition || 'always'
  );
  const [isEditing, setIsEditing] = useState(false);
  const labelRef = useRef<HTMLDivElement>(null);
  const { updateEdge } = useWorkflowStore();

  // Create path for the edge
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  useEffect(() => {
    // Update the edge in store if condition changes
    if (data?.condition !== edgeCondition) {
      updateEdge(id, { condition: edgeCondition });
    }
  }, [edgeCondition, data, id, updateEdge]);

  // Get the color based on condition
  const getEdgeColor = () => {
    switch (edgeCondition) {
      case 'success':
        return '#22c55e'; // Green
      case 'error':
        return '#ef4444'; // Red
      default:
        return '#3b82f6'; // Blue
    }
  };

  const handleConditionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setEdgeCondition(e.target.value as ConditionType);
  };

  const toggleEditing = () => {
    setIsEditing(!isEditing);
  };

  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        stroke={getEdgeColor()}
        strokeWidth={2}
        fill="none"
      />
      <foreignObject
        width={100}
        height={40}
        x={labelX - 50}
        y={labelY - 20}
        className="edge-foreignobject"
        requiredExtensions="http://www.w3.org/1999/xhtml"
      >
        <div 
          ref={labelRef}
          className="flex items-center justify-center"
          onClick={toggleEditing}
        >
          {isEditing ? (
            <select
              value={edgeCondition}
              onChange={handleConditionChange}
              onBlur={() => setIsEditing(false)}
              autoFocus
              className="bg-white border rounded px-2 py-1 text-xs shadow-sm text-gray-800"
              onClick={(e) => e.stopPropagation()}
            >
              <option value="always">Always</option>
              <option value="success">Success</option>
              <option value="error">Error</option>
            </select>
          ) : (
            <div
              className={`px-2 py-1 rounded-full text-xs font-medium text-white shadow-sm cursor-pointer ${
                edgeCondition === 'success' 
                  ? 'bg-green-500' 
                  : edgeCondition === 'error'
                    ? 'bg-red-500'
                    : 'bg-blue-500'
              }`}
            >
              {edgeCondition === 'always' ? 'Always' : edgeCondition === 'success' ? 'Success' : 'Error'}
            </div>
          )}
        </div>
      </foreignObject>
    </>
  );
}