"""Real Ohio data for Blind Ballot.

Statewide races on every Ohio ballot for the November 3, 2026 general election.
Source: Wood County Board of Elections certified candidate list (as of Aug 26, 2026),
cross-checked against the Hamilton County Board of Elections list (as of Aug 21, 2026).
Write-in candidates are not printed on the ballot and are not listed here.

These are real people. Blind Ballot never invents their positions: every real candidate starts
with no answers ("hasn't answered yet") until they answer through the candidate portal.
"""

SOURCE = {
    "name": "Wood County Board of Elections certified candidate list (Aug 26, 2026), cross-checked with Hamilton County Board of Elections (Aug 21, 2026)",
    "url": "https://boe.woodcountyohio.gov/DocumentCenter/View/1006/Candidate-List",
    "cross_check": "https://votehamiltoncountyohio.gov/wp-content/uploads/2026/08/November-2026-Candidate-Profile-1-3.pdf",
}
SAMPLE_BALLOT_URL = "https://voterlookup.ohiosos.gov/voterlookup.aspx"
COUNTY_BOARDS_URL = "https://www.ohiosos.gov/elections/elections-officials/county-boards-of-elections-directory/"


def person(name, party, running_mate=None):
    return {"name": name, "party": party, "running_mate": running_mate}


STATEWIDE = [
    {
        "id": "oh-us-senate",
        "office": "U.S. Senator",
        "detail": "Unexpired term ending Jan 3, 2029",
        "fec": "senate",
        "candidates": [
            person("Sherrod Brown", "Democratic"),
            person("Jon Husted", "Republican"),
            person("William B. Redpath", "Libertarian"),
            person("Greg Levy", "Other party"),
        ],
    },
    {
        "id": "oh-governor",
        "office": "Governor and Lieutenant Governor",
        "detail": "Term beginning Jan 11, 2027",
        "candidates": [
            person("Amy Acton", "Democratic", "David Pepper"),
            person("Vivek Ramaswamy", "Republican", "Robert A. McColley"),
            person("Don Kissick", "Libertarian", "James L. Mills"),
        ],
    },
    {
        "id": "oh-attorney-general",
        "office": "Attorney General",
        "detail": "Term beginning Jan 11, 2027",
        "candidates": [
            person("John J. Kulewicz", "Democratic"),
            person("Keith Faber", "Republican"),
        ],
    },
    {
        "id": "oh-auditor",
        "office": "Auditor of State",
        "detail": "Term beginning Jan 11, 2027",
        "candidates": [
            person("Annette Blackwell", "Democratic"),
            person("Frank LaRose", "Republican"),
        ],
    },
    {
        "id": "oh-secretary-of-state",
        "office": "Secretary of State",
        "detail": "Term beginning Jan 11, 2027",
        "candidates": [
            person("Allison Russo", "Democratic"),
            person("Robert Sprague", "Republican"),
            person("Tom Pruss", "Libertarian"),
        ],
    },
    {
        "id": "oh-treasurer",
        "office": "Treasurer of State",
        "detail": "Term beginning Jan 11, 2027",
        "candidates": [
            person("Seth Walsh", "Democratic"),
            person("Jay Edwards", "Republican"),
        ],
    },
    {
        "id": "oh-supreme-court-jan1",
        "office": "Justice of the Supreme Court",
        "detail": "Term beginning Jan 1, 2027",
        "candidates": [
            person("Marilyn Zayas", "Democratic"),
            person("Daniel R. Hawkins", "Republican"),
        ],
    },
    {
        "id": "oh-supreme-court-jan2",
        "office": "Justice of the Supreme Court",
        "detail": "Term beginning Jan 2, 2027",
        "candidates": [
            person("Jennifer Brunner", "Democratic"),
            person("Colleen O'Donnell", "Republican"),
        ],
    },
]
