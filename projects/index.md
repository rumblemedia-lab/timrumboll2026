---
layout: default
title: Projects
permalink: /projects/
---
<div class="wrap content-page">
  <p class="eyebrow"><span class="tally" aria-hidden="true"></span>Projects</p>
  <h1>Work I've voiced</h1>
  <p class="lede" style="margin:0.75rem 0 2.5rem;">A running log of real briefs, newest first.</p>

  <div class="project-log">
    {% assign all_projects = site.projects | sort: 'date' | reverse %}
    {% for project in all_projects %}
    <a class="project-row reveal" href="{{ project.url | relative_url }}">
      <span class="project-date">{{ project.date | date: "%b %Y" }}</span>
      <span>
        <span class="project-client">{{ project.client }}</span>
        <div class="project-excerpt">{{ project.excerpt }}</div>
      </span>
      <span class="project-sector">{{ project.sector }}</span>
    </a>
    {% endfor %}
  </div>
</div>
