// Plain Markdown is a portable human-readable review queue, not an attestation.
export function workspaceMarkdown(report) {
  const safe = value => String(value).replace(/[\\`*_{}\[\]<>#|]/g, '\\$&').replace(/[\r\n]+/g, ' ');
  const lines = [`# ${safe(report.workspace.title)}`, '', `Manifest: ${safe(report.workspace.input)}`, '', `Workspace revision: ${report.workspace.revision}`, '', report.semantics, ''];
  if (report.reviews) {
    lines.push(`Changes: ${report.triggers.map(t => `${t.kind} ${safe(t.id)}`).join(', ')}.`, '');
    lines.push(`## Review queue (${report.reviews.length})`, '');
    for (const model of report.reviews) {
      lines.push(`### ${safe(model.title ?? model.id)} (${safe(model.id)})`, '', `Location: ${safe(model.resolvedPath ?? model.location)}`, '', `Status: needs-review · Model: ${model.status}`, '');
      if (model.revision) lines.push(`Model revision: ${model.revision}`, '');
      for (const reason of model.reasons) lines.push(`- Changed ${reason.trigger.kind}: ${safe(reason.trigger.id)}${reason.via.length ? `; ${reason.via.map(e => `${safe(e.from)} → ${safe(e.to)} (${e.direction})`).join('; ')}` : '; directly selected'}.`);
      lines.push('', 'Evidence to inspect:', '');
      if (!model.sources.length) lines.push('- No declared evidence. Establish the basis before assessing accuracy.');
      for (const source of model.sources) lines.push(`- ${safe(source.id)}: ${safe(source.resolvedPath ?? source.location)} (${source.status})${source.revision ? `; declared revision: ${safe(source.revision)}` : '; no declared revision'}`);
      if (model.blockers.length) lines.push('', 'Access/reference gaps:', '', ...model.blockers.map(b => `- ${safe(b)}`));
      lines.push('', 'Outcome: pending. After review, record updated, still-accurate, blocked, or out-of-scope; include the evidence revision inspected and rationale.', '');
    }
    lines.push(`Not reached: ${report.unaffected.map(safe).join(', ') || 'none'}.`, '', `Changed sources with no declared consumers: ${report.unmatchedSources.map(safe).join(', ') || 'none'}.`, '');
  } else {
    lines.push(`References complete: ${report.referencesComplete ? 'yes' : 'no'}. Evidence has not been reviewed.`, '', '## Models', '',
      ...report.models.map(m => `- ${safe(m.id)}: ${safe(m.resolvedPath ?? m.location)} (${m.status}); evidence: ${m.sourceRefs.map(safe).join(', ') || 'none declared'}`), '',
      '## Elaboration', '', ...report.relationships.map(r => `- ${safe(r.child)} elaborates ${safe(r.parent)}${r.element ? ` / ${safe(r.element)}` : ''} (${r.status}).`), '',
      '## Sources', '', ...report.sources.map(s => `- ${safe(s.id)}: ${safe(s.resolvedPath ?? s.location)} (${s.status})`), '');
  }
  if (report.diagnostics.length) lines.push('## Diagnostics', '', ...report.diagnostics.map(d => `- ${d.severity}: ${safe(d.message)}`), '');
  return lines.join('\n') + '\n';
}
