/**
 * Algorithmic Prioritization Engine for Disaster Response
 * Computes a priority score (0 to 100) for a distress incident ticket.
 * Also returns a priority label: 'CRITICAL', 'HIGH', 'MEDIUM', or 'LOW'.
 */

export function calculatePriorityScore(incident) {
  const { category, urgency, vulnerability = {}, createdAt } = incident;
  
  let score = 0;

  // 1. Base Score by Category
  switch (category) {
    case 'medical':
      score += 45; // Critical medical need
      break;
    case 'rescue':
      score += 38; // Trapped, physical threat
      break;
    case 'food_water':
      score += 18; // Subsistence need
      break;
    case 'shelter':
      score += 10; // Logistical need
      break;
    default:
      score += 5;
  }

  // 2. Add score based on reporter's selected urgency level
  switch (urgency) {
    case 'critical':
      score += 25;
      break;
    case 'high':
      score += 15;
      break;
    case 'medium':
      score += 5;
      break;
    case 'low':
    default:
      score += 0;
  }

  // 3. Vulnerability Modifiers
  if (vulnerability.infantsOrChildren) score += 12;
  if (vulnerability.elderly) score += 10;
  if (vulnerability.pregnant) score += 15;
  if (vulnerability.disabled) score += 15;
  if (vulnerability.trapped) score += 15; // physical confinement

  // 4. Time Elapsed Modifier (Prevention of Starvation)
  // Add +1 point for every 10 minutes elapsed, up to a max of +15 points.
  if (createdAt) {
    const elapsedMinutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
    if (elapsedMinutes > 0) {
      const timeBonus = Math.min(15, Math.floor(elapsedMinutes / 10));
      score += timeBonus;
    }
  }

  // Cap at 100 and min at 0
  const finalScore = Math.max(0, Math.min(100, score));

  // Determine Severity Label
  let label = 'LOW';
  if (finalScore >= 75) {
    label = 'CRITICAL';
  } else if (finalScore >= 50) {
    label = 'HIGH';
  } else if (finalScore >= 25) {
    label = 'MEDIUM';
  }

  return {
    score: finalScore,
    label
  };
}
