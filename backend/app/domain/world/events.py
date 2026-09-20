"""The kinds of change the island can announce. One enum, carried on the wire."""

from enum import StrEnum


class WorldEventKind(StrEnum):
    # a file of the student's arrived and its fast match ran
    RESOURCE_ADDED = "RESOURCE_ADDED"
    # the model finished reading that file
    RESOURCE_ANALYZED = "RESOURCE_ANALYZED"
    # first evidence on a concept the student had not touched
    CONCEPT_DISCOVERED = "CONCEPT_DISCOVERED"
    # a concept became reachable because a neighbour was touched
    FRONTIER_EXPANDED = "FRONTIER_EXPANDED"
    UNDERSTANDING_GAIN = "UNDERSTANDING_GAIN"
    UNDERSTANDING_DROP = "UNDERSTANDING_DROP"
    CONCEPT_MASTERED = "CONCEPT_MASTERED"
