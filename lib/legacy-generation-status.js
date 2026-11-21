const stages = {
 queued: 'Waiting for the generation server',
 reading_asset_config: 'Reading champion metadata',
 loading_base_nft_image: 'Loading champion image',
 prompting_openai_for_character: 'Creating character',
 base_stats_generated: 'Character stats generated',
 effects_and_moves_finalized: 'Moves and effects finalized',
 composing_selected_traits: 'Composing selected traits',
 generating_idle_animation_sheet: 'Generating idle animation',
 idle_animation_generated: 'Idle animation generated',
 all_animation_assets_generated: 'Saving character',
 done: 'Your 2D character is ready.',
};

export function legacyGenerationProgress(status) {
 const state = status?.status;
 if (!state || (!status.generationJobId && state === 'completed')) return null;
 const failed = ['error', 'failed'].includes(state), complete = state === 'completed';
 const progress = Number(status.progress);
 const percent = complete ? 100 : Number.isFinite(progress) ? Math.max(0, Math.min(99, Math.round(progress))) : 0;
 const move = /^generating_move_(\d+)_animation_sheet$/.exec(status.stage || '');
 const assets = /^move_(\d+)_assets_generated$/.exec(status.stage || '');
 const label = failed ? 'Generation stopped' : complete ? stages.done : state === 'queued' ? stages.queued
  : move ? `Generating move ${move[1]} animation` : assets ? `Move ${assets[1]} assets generated`
  : stages[status.stage] || 'Generating character';
 return {active: !failed && !complete, failed, percent, label};
}

export function queuedGenerationStatus(previous, requestId) {
 // A live snapshot can arrive before the queue response; never reset its progress.
 return previous?.generationJobId === requestId ? previous
  : {...previous, generationJobId: requestId, status: 'queued', stage: 'queued', progress: 0, errorMessage: null};
}
