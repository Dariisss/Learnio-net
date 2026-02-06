using Learnio.Data;
using Learnio.Dtos;
using Learnio.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Learnio.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AssignmentsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public AssignmentsController(ApplicationDbContext context)
        {
            _context = context;
        }

        // 1. СОЗДАТЬ ЗАДАНИЕ (Учитель)
        // POST: api/assignments
        [HttpPost]
        public async Task<IActionResult> CreateAssignment([FromBody] CreateAssignmentDto model)
        {
            // Проверяем, существует ли курс
            var course = await _context.Courses.FindAsync(model.CourseId);
            if (course == null)
            {
                return NotFound("Курс не найден.");
            }

            // Создаем задание
            var assignment = new Assignment
            {
                Id = Guid.NewGuid(),
                CourseId = model.CourseId,
                Title = model.Title,
                Description = model.Description,
                Deadline = model.Deadline,
                MaxScore = model.MaxScore
            };

            _context.Assignments.Add(assignment);
            await _context.SaveChangesAsync();

            return Ok(assignment);
        }

        // 2. ПОЛУЧИТЬ ЗАДАНИЯ КУРСА (Студент/Учитель)
        // GET: api/assignments/course/{courseId}
        [HttpGet("course/{courseId}")]
        public async Task<IActionResult> GetCourseAssignments(Guid courseId)
        {
            var assignments = await _context.Assignments
                .Where(a => a.CourseId == courseId)
                .OrderBy(a => a.Deadline) // Сортируем: сначала срочные
                .Select(a => new
                {
                    a.Id,
                    a.Title,
                    a.Description,
                    Deadline = a.Deadline.ToString("yyyy-MM-dd HH:mm"), // Красивая дата
                    a.MaxScore
                })
                .ToListAsync();

            return Ok(assignments);
        }
    }
}