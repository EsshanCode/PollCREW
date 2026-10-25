"""Demo ballots for Blind Ballot.

Offices are real local offices in Delaware and Franklin County, Ohio. Every candidate,
position, endorsement group and spending figure is FICTIONAL demo data. Blind Ballot never
invents positions for real people; real candidates enter their own through the portal.

Positions use one scale for voters and candidates:
  -2 strongly disagree, -1 disagree, 0 neutral, 1 agree, 2 strongly agree.
"""

ISSUES = [
    {
        "id": "school_levy",
        "topic": "Schools",
        "short": "School levy for smaller classes",
        "text": "I'd vote for a school levy to keep class sizes small, even if my property taxes go up.",
    },
    {
        "id": "school_buildings",
        "topic": "Schools",
        "short": "Build new schools for growth",
        "text": "As enrollment grows, the district should build new schools instead of adding portable classrooms and redrawing boundaries.",
    },
    {
        "id": "taxes_services",
        "topic": "Taxes",
        "short": "Cut taxes even if services shrink",
        "text": "Local government should cut property taxes, even if some services are reduced.",
    },
    {
        "id": "housing_types",
        "topic": "Housing",
        "short": "Allow more kinds of homes",
        "text": "My area should allow more kinds of homes, like townhomes and apartments, to help bring prices down.",
    },
    {
        "id": "growth_pace",
        "topic": "Growth",
        "short": "Slow development, protect farmland",
        "text": "New development should slow down to protect farmland and open space.",
    },
    {
        "id": "roads",
        "topic": "Roads",
        "short": "Roads and traffic first",
        "text": "Road repair and traffic fixes should get more money, even if other projects have to wait.",
    },
    {
        "id": "public_safety",
        "topic": "Safety",
        "short": "More police, sheriff and fire funding",
        "text": "Police, sheriff and fire departments should get more funding for staff and faster response times.",
    },
    {
        "id": "parks_libraries",
        "topic": "Parks",
        "short": "Pay more for parks and libraries",
        "text": "Parks, trails and libraries are worth paying more for.",
    },
]
ISSUE_IDS = [i["id"] for i in ISSUES]

COUNTY_ISSUES = {
    "commissioner": [
        "taxes_services",
        "housing_types",
        "growth_pace",
        "roads",
        "public_safety",
        "parks_libraries",
    ],
    "schools": ["school_levy", "school_buildings", "taxes_services"],
    "local": ["housing_types", "growth_pace", "roads", "public_safety", "parks_libraries"],
}


def c(id, name, party, spending, endorsements, positions):
    """positions: {issue: (stance, reason)}"""
    return {
        "id": id,
        "name": name,
        "party": party,
        "spending": spending,
        "endorsements": endorsements,
        "answers": {k: {"stance": v[0], "reason": v[1]} for k, v in positions.items()},
        "source": "demo",
    }


COUNTIES = {
    "delaware": {
        "id": "delaware",
        "name": "Delaware County",
        "place": "Lewis Center, Powell, Delaware",
        "sample_address": "2840 E Orange Rd, Lewis Center, OH 43035",
        "zips": [
            "43003", "43015", "43021", "43032", "43035", "43061",
            "43065", "43066", "43074", "43082", "43240",
        ],
        "races": [
            {
                "id": "del-commissioner",
                "office": "Delaware County Commissioner",
                "what": "Sets the county budget, roads, zoning appeals, parks and the sheriff's funding.",
                "vote_for": 1,
                "partisan": True,
                "issues": COUNTY_ISSUES["commissioner"],
                "candidates": [
                    c("dw", "Dana Whitfield", "Republican", 86400,
                      ["Growth Done Right PAC", "Central Ohio Builders Alliance"],
                      {
                          "taxes_services": (2, "Delaware County families are taxed enough. I'll find savings before asking for more."),
                          "housing_types": (1, "Let builders meet demand. More supply keeps our kids able to live here."),
                          "growth_pace": (-2, "Growth pays for our schools and roads. Slowing it just raises everyone's taxes."),
                          "roads": (2, "Route 23 and Big Walnut Road can't wait. Roads are the county's first job."),
                          "public_safety": (1, "Our deputies need to keep pace with a growing county."),
                          "parks_libraries": (-1, "Parks are great, but they shouldn't come before roads and safety."),
                      }),
                    c("mo", "Marcus Oyelaran", "Democratic", 21300,
                      ["Friends of Alum Creek Trails"],
                      {
                          "taxes_services": (-2, "Cutting taxes now means cutting the services people moved here for."),
                          "housing_types": (2, "Teachers and nurses should be able to afford to live where they work."),
                          "growth_pace": (0, "Growth should be planned, not stopped or rushed."),
                          "roads": (0, "Fix what we have, but not at the expense of everything else."),
                          "public_safety": (0, "Fund response times based on data, not slogans."),
                          "parks_libraries": (2, "Our trails and libraries are why families choose Delaware County."),
                      }),
                    c("lk", "Linda Kowalczyk", "Republican", 4100,
                      ["Delaware Farmland Trust"],
                      {
                          "taxes_services": (1, "Spend carefully, but don't gut the basics."),
                          "housing_types": (-1, "Keep neighborhoods the way residents planned them."),
                          "growth_pace": (2, "We're paving farmland faster than we can build schools. Slow down."),
                          "roads": (1, "Fix congestion where the growth already is."),
                          "public_safety": (2, "Response times are slipping in the north county. Hire deputies and medics."),
                          "parks_libraries": (1, "Open space is part of what we're protecting."),
                      }),
                ],
            },
            {
                "id": "del-olentangy",
                "office": "Olentangy Local Schools Board of Education",
                "what": "Sets the school budget, proposes levies, and decides on new buildings and boundaries.",
                "vote_for": 2,
                "partisan": False,
                "issues": COUNTY_ISSUES["schools"],
                "candidates": [
                    c("pr", "Priya Raman", "Nonpartisan", 3200,
                      ["Parents for Smaller Classes"],
                      {
                          "school_levy": (2, "Class sizes are creeping past 30. A levy is the honest way to fix it."),
                          "school_buildings": (1, "We need seats, but let's use every building we have first."),
                          "taxes_services": (-1, "Our schools are our property values. Underfunding them costs more later."),
                      }),
                    c("gh", "Greg Halvorsen", "Nonpartisan", 38900,
                      ["Taxpayers for a Leaner Delaware", "County Republican Party"],
                      {
                          "school_levy": (-2, "The district should cut administration before asking homeowners for more."),
                          "school_buildings": (-1, "Portables and smart boundaries are cheaper than new buildings."),
                          "taxes_services": (2, "Seniors on fixed incomes are being taxed out of their homes."),
                      }),
                    c("tn", "Teresa Nwosu", "Nonpartisan", 9800,
                      ["County Democratic Party"],
                      {
                          "school_levy": (1, "I'll support a levy if the plan is clear and the spending is public."),
                          "school_buildings": (2, "Ten thousand new students are coming. Portables aren't a plan."),
                          "taxes_services": (-2, "Cutting school funding to cut taxes is a false savings."),
                      }),
                    c("ab", "Alan Brooks", "Nonpartisan", 1500, [],
                      {
                          "school_levy": (0, "Show me the budget first, then we can talk about a levy."),
                          "school_buildings": (-2, "We over-built before. Redraw boundaries before we pour concrete."),
                          "taxes_services": (1, "Every dollar should be justified before we ask for more."),
                      }),
                ],
            },
            {
                "id": "del-orange-trustee",
                "office": "Orange Township Trustee",
                "what": "Runs township roads, fire and EMS, zoning and parks for Orange Township.",
                "vote_for": 1,
                "partisan": False,
                "issues": COUNTY_ISSUES["local"],
                "candidates": [
                    c("ks", "Kevin Shah", "Nonpartisan", 52000,
                      ["Growth Done Right PAC"],
                      {
                          "housing_types": (2, "Mixed housing near Polaris keeps young families here."),
                          "growth_pace": (-2, "Development brings the tax base that pays for our fire stations."),
                          "roads": (1, "New development should pay for the roads it needs."),
                          "public_safety": (0, "Our fire department is strong. Keep it that way."),
                          "parks_libraries": (-1, "Parks matter, but the township has to live within its means."),
                      }),
                    c("rd", "Rosa Delgado", "Nonpartisan", 6700,
                      ["Safe Streets Coalition", "County Republican Party"],
                      {
                          "housing_types": (-1, "Our zoning plan was written with residents. Stick to it."),
                          "growth_pace": (1, "Slow down until the roads and schools catch up."),
                          "roads": (2, "Orange Road at rush hour is a safety problem, not just an annoyance."),
                          "public_safety": (2, "Add a medic unit so response times stay under eight minutes."),
                          "parks_libraries": (1, "Finish the trail connections we already promised."),
                      }),
                    c("bt", "Bill Thornton", "Nonpartisan", 2300,
                      ["Friends of Alum Creek Trails"],
                      {
                          "housing_types": (0, "Some townhomes near Route 23 make sense. Not everywhere."),
                          "growth_pace": (2, "Protect the open space that's left before it's gone."),
                          "roads": (0, "Maintain what we have. No new widening projects."),
                          "public_safety": (1, "Support our firefighters with the staff they ask for."),
                          "parks_libraries": (2, "Parks and trails are the best money the township spends."),
                      }),
                ],
            },
        ],
        "measures": [
            {
                "id": "del-library",
                "title": "Delaware County District Library levy (renewal)",
                "what": "Renews the library's operating levy at the current rate. No tax increase.",
                "yes_issues": ["parks_libraries"],
                "no_issues": ["taxes_services"],
            }
        ],
    },
    "franklin": {
        "id": "franklin",
        "name": "Franklin County",
        "place": "Columbus, Dublin, Westerville",
        "sample_address": "1739 N High St, Columbus, OH 43210",
        "zips": [str(z) for z in range(43201, 43300)]
        + ["43002", "43016", "43017", "43026", "43054", "43068", "43081",
           "43085", "43109", "43110", "43119", "43123", "43125", "43137"],
        "races": [
            {
                "id": "fr-commissioner",
                "office": "Franklin County Commissioner",
                "what": "Sets the county budget for roads, the sheriff, social services and parks.",
                "vote_for": 1,
                "partisan": True,
                "issues": [i for i in COUNTY_ISSUES["commissioner"] if i != "growth_pace"],
                "candidates": [
                    c("ap", "Angela Pierce", "Democratic", 112000,
                      ["County Democratic Party", "Columbus Forward PAC"],
                      {
                          "taxes_services": (-1, "Our services are stretched. This isn't the time to cut revenue."),
                          "housing_types": (2, "Columbus is short tens of thousands of homes. Let's build them."),
                          "roads": (0, "Transit and roads together, not roads alone."),
                          "public_safety": (0, "Keep funding steady and invest in prevention."),
                          "parks_libraries": (1, "Metro Parks are a county treasure worth protecting."),
                      }),
                    c("tr", "Tom Rasmussen", "Republican", 47500,
                      ["County Republican Party", "Franklin Taxpayers League"],
                      {
                          "taxes_services": (2, "Property tax bills jumped after reappraisal. Give homeowners relief."),
                          "housing_types": (-1, "Neighborhoods should decide, not county planners."),
                          "roads": (2, "Fix potholes and the I-270 bottlenecks first."),
                          "public_safety": (2, "Hire more deputies and fully staff the jail."),
                          "parks_libraries": (-1, "Nice to have, but not ahead of safety and roads."),
                      }),
                    c("jw", "Jamal Whitaker", "Independent", 3900, [],
                      {
                          "taxes_services": (0, "Audit the budget, then decide. No promises either way."),
                          "housing_types": (1, "Allow duplexes and townhomes near bus lines."),
                          "roads": (2, "The east side has waited decades for basic road repair."),
                          "public_safety": (1, "Faster EMS response is the priority."),
                          "parks_libraries": (2, "Every neighborhood deserves a park within walking distance."),
                      }),
                ],
            },
            {
                "id": "fr-council",
                "office": "Columbus City Council, District 4",
                "what": "Passes city laws and the budget for police, fire, streets, parks and zoning.",
                "vote_for": 1,
                "partisan": False,
                "issues": COUNTY_ISSUES["local"],
                "candidates": [
                    c("sb", "Sofia Brennan", "Nonpartisan", 74000,
                      ["County Democratic Party", "Columbus Forward PAC"],
                      {
                          "housing_types": (2, "Legalize apartments along High Street and every major corridor."),
                          "growth_pace": (-1, "Columbus should grow up, not out. Growth is how we stay affordable."),
                          "roads": (0, "Fix streets, but build bus lanes and sidewalks too."),
                          "public_safety": (-1, "Shift some funding to mental health responders."),
                          "parks_libraries": (1, "Keep rec centers open later for teens."),
                      }),
                    c("dl", "Derek Lindqvist", "Nonpartisan", 11200,
                      ["Safe Streets Coalition"],
                      {
                          "housing_types": (0, "Build more, but with real input from each neighborhood."),
                          "growth_pace": (0, "Growth is fine if infrastructure keeps up."),
                          "roads": (2, "Our streets are crumbling. Fund repaving every year."),
                          "public_safety": (2, "Fully staff police and fire before anything else."),
                          "parks_libraries": (0, "Maintain the parks we have."),
                      }),
                    c("mt", "Mei Tanaka", "Nonpartisan", 2800,
                      ["Friends of the Olentangy Trail"],
                      {
                          "housing_types": (1, "Townhomes and small apartments fit our neighborhoods fine."),
                          "growth_pace": (1, "Keep the ravines and green space we have left."),
                          "roads": (1, "Fix the streets where kids walk to school first."),
                          "public_safety": (0, "Better lighting and crosswalks prevent a lot of problems."),
                          "parks_libraries": (2, "Libraries are the last free indoor place in a neighborhood."),
                      }),
                ],
            },
            {
                "id": "fr-ccs",
                "office": "Columbus City Schools Board of Education",
                "what": "Sets the district budget, proposes levies, and decides on buildings and closures.",
                "vote_for": 2,
                "partisan": False,
                "issues": COUNTY_ISSUES["schools"],
                "candidates": [
                    c("ro", "Rachel Ortiz", "Nonpartisan", 41000,
                      ["County Democratic Party", "Columbus Forward PAC"],
                      {
                          "school_levy": (2, "Our kids deserve the same class sizes as the suburbs."),
                          "school_buildings": (2, "Replace buildings that are 80 years old. It's past time."),
                          "taxes_services": (-2, "Starving schools to cut taxes hurts the whole city."),
                      }),
                    c("nc", "Nathan Cole", "Nonpartisan", 5600,
                      ["Franklin Taxpayers League"],
                      {
                          "school_levy": (-1, "Results first. The district has to earn the next levy."),
                          "school_buildings": (-2, "Consolidate half-empty buildings before building new ones."),
                          "taxes_services": (2, "Families are leaving the city over tax bills."),
                      }),
                    c("ig", "Imani Grant", "Nonpartisan", 2100,
                      ["Parents for Smaller Classes"],
                      {
                          "school_levy": (2, "Smaller classes are the single best thing we can buy."),
                          "school_buildings": (-1, "Put the money in teachers, not new buildings."),
                          "taxes_services": (0, "Spend what we have better before deciding on more."),
                      }),
                    c("ph", "Paul Hendricks", "Nonpartisan", 18300,
                      ["County Republican Party"],
                      {
                          "school_levy": (0, "I'd consider a levy tied to clear reading goals."),
                          "school_buildings": (1, "Some buildings truly need replacing. Prioritize the worst."),
                          "taxes_services": (1, "Taxpayers deserve a leaner central office."),
                      }),
                ],
            },
        ],
        "measures": [
            {
                "id": "fr-library",
                "title": "Columbus Metropolitan Library levy (additional)",
                "what": "A new levy to expand branch hours and open two branches. Raises property taxes.",
                "yes_issues": ["parks_libraries"],
                "no_issues": ["taxes_services"],
            }
        ],
    },
}


def county_for_zip(text):
    import re

    found = re.findall(r"\b(43\d{3})\b", text or "")
    for code in reversed(found):  # the ZIP is usually last in an address
        for county in COUNTIES.values():
            if code in county["zips"]:
                return county["id"]
    return None
