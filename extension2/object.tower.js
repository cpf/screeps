class Tower {
    constructor (tower, room) {
        this.tower = tower
        this.room = room
    }

    run() {
        let hostiles = this.room.find(FIND_HOSTILE_CREEPS)
        if (hostiles.length > 0) {
            this.attack()
            return
        }

        let target = this.tower.pos.findClosestByRange(FIND_MY_CREEPS, {
            filter: (creep) => creep.hits < creep.hitsMax
        })
        if (target) {
            this.tower.heal(target)
        }

        let repairTargets = this.tower.pos.findInRange(FIND_STRUCTURES, TOWER_OPTIMAL_RANGE, {
            filter: (structure) => structure.structureType != STRUCTURE_CONTROLLER && structure.hits < structure.hitsMax
        })
        if (repairTargets.length > 0) {
            this.tower.repair(repairTargets[0])
        }
    }

    attack() {
        let target = this.tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS)
        this.tower.attack(target)
    }
}

module.exports = Tower