import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Scenario, HistoryStep, Outcome } from '../engine/types';

interface DrillPathMapProps {
  scenario: Scenario;
  history: HistoryStep[];
  outcome: Outcome;
  declinedAtStart?: boolean;
}

export const DrillPathMap: React.FC<DrillPathMapProps> = ({
  scenario,
  history,
  outcome,
  declinedAtStart
}) => {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language as 'en' | 'hi' | 'hing') || 'en';

  const outcomeColors = {
    safe: {
      border: '#0B4F4A',
      fill: '#E6F4EA',
      text: '#0B4F4A',
      label: t('outcomes.safe', 'Safe')
    },
    almost: {
      border: '#D97706',
      fill: '#FEF3C7',
      text: '#92400E',
      label: t('outcomes.almost', 'Almost')
    },
    retry: {
      border: '#E07856',
      fill: '#FDF2EE',
      text: '#C05621',
      label: t('outcomes.tryAgain', "Let's try again")
    }
  }[outcome];

  if (declinedAtStart) {
    return (
      <div className="bg-white rounded-card p-4 border-2 border-teal-deep/20 shadow-soft">
        <h3 className="font-extrabold text-base text-teal-deep mb-2">
          {t('drill.debrief.pathMapTitle', 'Your Path Map (The Butterfly Effect)')}
        </h3>
        <p className="text-sm text-brown-dark/80 mb-3">
          {t('drill.debrief.pathMapSub', 'Shows the path you took versus the branches you avoided.')}
        </p>
        <svg viewBox="0 0 400 120" className="w-full h-auto">
          {/* Incoming Call */}
          <rect x="20" y="35" width="120" height="50" rx="10" fill="#0B4F4A" />
          <text x="80" y="65" fill="#FFF1CC" fontSize="13" fontWeight="bold" textAnchor="middle">
            Incoming Call
          </text>

          {/* Solid line to declined */}
          <line x1="140" y1="60" x2="220" y2="60" stroke="#0B4F4A" strokeWidth="3" markerEnd="url(#arrow-teal)" />
          <text x="180" y="52" fill="#0B4F4A" fontSize="10" fontWeight="bold" textAnchor="middle">
            Declined
          </text>

          {/* Outcome Safe */}
          <rect x="220" y="35" width="150" height="50" rx="10" fill="#E6F4EA" stroke="#0B4F4A" strokeWidth="2" />
          <text x="295" y="65" fill="#0B4F4A" fontSize="14" fontWeight="bold" textAnchor="middle">
            Safe (Hung up)
          </text>
        </svg>
      </div>
    );
  }

  // Define node definitions in sequence
  const nodeSequence = ['n1', 'n2', 'n3', 'n4'];
  const visitedNodeIds = new Set(history.map(h => h.nodeId));

  // Determine which step chosen for each visited node
  const chosenOptionByNode = new Map<string, string>();
  history.forEach(h => {
    chosenOptionByNode.set(h.nodeId, h.optionChosen.id);
  });

  return (
    <div className="bg-white rounded-card p-4 sm:p-5 border-2 border-teal-deep/20 shadow-soft space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-teal-deep/10 pb-3">
        <div>
          <h3 className="font-black text-lg text-teal-deep">
            {t('drill.debrief.pathMapTitle', 'Your Path Map (The Butterfly Effect)')}
          </h3>
          <p className="text-xs sm:text-sm text-brown-dark/75">
            {t('drill.debrief.pathMapSub', 'Shows the path you took versus the branches you avoided.')}
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-bold text-brown-dark shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-1 bg-teal-deep rounded-full inline-block" />
            <span>Path taken</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-1 border-t-2 border-dashed border-gray-400 inline-block" />
            <span className="text-gray-600">Branch not taken</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="w-full overflow-x-auto py-2">
        <svg
          viewBox="0 0 640 400"
          className="w-full min-w-[560px] h-auto select-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <marker id="arrow-teal" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#0B4F4A" />
            </marker>
            <marker id="arrow-gray" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#9CA3AF" />
            </marker>
          </defs>

          {/* Node columns */}
          {nodeSequence.map((nodeId, idx) => {
            const node = scenario.nodes[nodeId];
            if (!node) return null;
            const isVisited = visitedNodeIds.has(nodeId);
            const chosenOptId = chosenOptionByNode.get(nodeId);

            // Coordinates for this node column
            const x = 50 + idx * 135;
            const y = 180;

            const nodeLabels: Record<string, string> = {
              n1: '1. Official Claim',
              n2: '2. Arrest Threat',
              n3: '3. Aadhaar / OTP',
              n4: '4. Money Demand'
            };

            return (
              <g key={nodeId}>
                {/* Node Box */}
                <rect
                  x={x - 45}
                  y={y - 25}
                  width="95"
                  height="50"
                  rx="10"
                  fill={isVisited ? '#0B4F4A' : '#F3F4F6'}
                  stroke={isVisited ? '#073632' : '#D1D5DB'}
                  strokeWidth="2"
                  filter={isVisited ? 'drop-shadow(0 2px 4px rgba(11, 79, 74, 0.25))' : undefined}
                />
                <text
                  x={x + 2}
                  y={y - 5}
                  fill={isVisited ? '#FFF1CC' : '#6B7280'}
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  Step {idx + 1}
                </text>
                <text
                  x={x + 2}
                  y={y + 12}
                  fill={isVisited ? '#FFFFFF' : '#9CA3AF'}
                  fontSize="9.5"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {nodeLabels[nodeId] || nodeId}
                </text>

                {/* Render Option branches if this node was visited */}
                {isVisited && node.options.map((opt, optIdx) => {
                  const isChosen = opt.id === chosenOptId;
                  const isNextEnd = opt.next === 'END';

                  // Position alternative branches above and below
                  const offsetY = (optIdx - 1) * 60;
                  const targetX = x + 135;
                  const targetY = y + offsetY;

                  const optShortText = opt.label[lang] || opt.label.en;
                  const truncated = optShortText.length > 18 ? `${optShortText.slice(0, 16)}...` : optShortText;

                  if (isChosen) {
                    // Chosen path - Solid Teal line
                    return (
                      <g key={opt.id}>
                        <path
                          d={`M ${x + 50} ${y} C ${x + 90} ${y}, ${targetX - 90} ${isNextEnd ? 180 : targetY}, ${targetX - 50} ${isNextEnd ? 180 : targetY}`}
                          fill="none"
                          stroke="#0B4F4A"
                          strokeWidth="3.5"
                          markerEnd="url(#arrow-teal)"
                        />
                        <rect
                          x={x + 35}
                          y={y - 18}
                          width="75"
                          height="18"
                          rx="4"
                          fill="#FFF1CC"
                          stroke="#0B4F4A"
                          strokeWidth="1"
                        />
                        <text
                          x={x + 72}
                          y={y - 5}
                          fill="#0B4F4A"
                          fontSize="8.5"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {truncated}
                        </text>
                      </g>
                    );
                  } else {
                    // Alternative branch not taken (Butterfly Effect) - Dashed Gray
                    return (
                      <g key={opt.id} opacity="0.65">
                        <path
                          d={`M ${x + 50} ${y} C ${x + 80} ${y}, ${x + 80} ${y + (optIdx === 0 ? -70 : 70)}, ${x + 115} ${y + (optIdx === 0 ? -70 : 70)}`}
                          fill="none"
                          stroke="#9CA3AF"
                          strokeWidth="2"
                          strokeDasharray="4 3"
                          markerEnd="url(#arrow-gray)"
                        />
                        <rect
                          x={x + 65}
                          y={y + (optIdx === 0 ? -82 : 58)}
                          width="68"
                          height="16"
                          rx="3"
                          fill="#F9FAFB"
                          stroke="#D1D5DB"
                          strokeWidth="1"
                        />
                        <text
                          x={x + 99}
                          y={y + (optIdx === 0 ? -70 : 70)}
                          fill="#4B5563"
                          fontSize="7.5"
                          textAnchor="middle"
                        >
                          {opt.flags.includes('hung_up')
                            ? 'Hang up (Safe)'
                            : opt.flags.includes('used_pause')
                            ? 'Pause (Safe)'
                            : opt.calm
                            ? 'Calm option'
                            : 'Branch avoided'}
                        </text>
                      </g>
                    );
                  }
                })}
              </g>
            );
          })}

          {/* Final Outcome Box on Far Right */}
          <g>
            <rect
              x="530"
              y="150"
              width="95"
              height="60"
              rx="12"
              fill={outcomeColors.fill}
              stroke={outcomeColors.border}
              strokeWidth="2.5"
              filter="drop-shadow(0 2px 6px rgba(0,0,0,0.1))"
            />
            <text
              x="577"
              y="175"
              fill={outcomeColors.text}
              fontSize="11"
              fontWeight="bold"
              textAnchor="middle"
            >
              Outcome
            </text>
            <text
              x="577"
              y="196"
              fill={outcomeColors.text}
              fontSize="13"
              fontWeight="black"
              textAnchor="middle"
            >
              {outcomeColors.label}
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
};
