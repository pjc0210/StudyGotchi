"""Assessment-item concept-link normalization (spec: "Multi-concept
assessment questions"): evidence is distributed across concepts by
relevance weight, so a model's raw weights are rescaled to sum to 1 per
item.
"""

from app.schemas.extraction import AssessmentItemConceptLinkOut


def normalize_concept_links(
    links: list[AssessmentItemConceptLinkOut],
) -> list[AssessmentItemConceptLinkOut]:
    total = sum(link.relevance_weight for link in links)
    if total <= 0:
        return links
    return [
        AssessmentItemConceptLinkOut(concept_name=link.concept_name, relevance_weight=link.relevance_weight / total)
        for link in links
    ]
