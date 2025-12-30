import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JeuxCard } from './jeux-card';

describe('JeuxCard', () => {
  let component: JeuxCard;
  let fixture: ComponentFixture<JeuxCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JeuxCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(JeuxCard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
