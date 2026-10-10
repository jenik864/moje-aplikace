# Junk Food: individual habit pillars

The food dashboard has its own habit garden, integrated per-pillar daily choices, a weekly day strip and a selectable 28-day history. There are no calorie, weight or portion targets. Plant leaves represent each pillar's real **self-reported, confirmed** results in the last seven completed days; unknown days stay empty. Plants are a visual metaphor, not a health measurement.

A program supports one to six active pillars, including a custom rule up to 80 characters. Existing `target`, signature, reasons, rank/PRIME, daily logs and trigger history remain intact. Existing one-rule records map to the virtual `original` pillar until pillar settings/answers are first persisted.

`foodPillars` stores each rule's ID, label and inclusive start date / exclusive end date. `foodEntries[day][pillarId]` stores its boolean answer. New pillars start today and never become yesterday's requirements. Pause takes effect tomorrow, leaving today's and previous days' requirements intact. A scheduled pause can be cancelled. Resuming an already ended pillar creates a new period/ID; old entries remain historical.

Today is a draft. Yesterday can be confirmed only after **all pillars active on that date** have answers. A whole-day success requires every active pillar to be kept. One day's multiple pillar answers can never award multiple rank days. Correcting yesterday's answer recomputes a previously confirmed whole-day result immediately; PRIME remains the historical maximum. Missing confirmations break the series as before. Ranks retain the existing confirmed-day milestones.

The food-specific SOS asks about hunger, craving, stress or uncertainty. Hunger offers an immediate normal-meal route without a timer. The two-minute pause is optional, uses a wall-clock deadline, and can be ended at any time. Return stores the chosen need and actual pause duration; closing stores nothing. SOS does not change any pillar or rank.

Automated detection of eating is not claimed. All food progress is explicitly based on the user's records. Porn Reboot and Doomscrolling data/scoring are unchanged.
