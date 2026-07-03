---
layout: default
title: Notes
permalink: /notes/
---
<div class="wrap content-page">
  <p class="eyebrow"><span class="tally" aria-hidden="true"></span>Notes</p>
  <h1>Studio notes &amp; thoughts</h1>
  <p class="lede" style="margin:0.75rem 0 2.5rem;">Occasional writing on gear, technique and the business of voice over.</p>

  {% assign all_notes = site.notes | sort: 'date' | reverse %}
  {% for note in all_notes %}
  <div class="note-card reveal">
    <span class="note-date">{{ note.date | date: "%d %B %Y" }}</span>
    <h3><a href="{{ note.url | relative_url }}">{{ note.title }}</a></h3>
    <p class="project-excerpt">{{ note.excerpt }}</p>
  </div>
  {% endfor %}
</div>
